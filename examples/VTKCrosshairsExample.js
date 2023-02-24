import React from 'react';
import { Component } from 'react';
import {
  View2D,
  vtkInteractorStyleMPRCrosshairs,
  vtkSVGCrosshairsWidget,
} from '@vtk-viewport';
import vtkVolume from 'vtk.js/Sources/Rendering/Core/Volume';
import vtkVolumeMapper from 'vtk.js/Sources/Rendering/Core/VolumeMapper';
import './initCornerstone';

import {
  _getSeriesMetaDataMap,
  _calculateDimensions,
  _createVtkVolume,
  _getVolumeCenterIpp,
} from './util';

async function createImageDataObject() {
  const seriesImageIds = [
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOE_20221016235836.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOD_20221016235826.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOC_20221016235827.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOB_20221016235836.dcm',
  ];

  const metaDataMap = await _getSeriesMetaDataMap(seriesImageIds);

  const {
    dimensions,
    orientation,
    multiComponent,
    spacing,
    zAxis,
  } = _calculateDimensions(metaDataMap);

  const imageData = await _createVtkVolume(
    seriesImageIds,
    dimensions,
    spacing,
    zAxis
  );
  const centerIpp = _getVolumeCenterIpp(imageData);

  const imageDataObject = {
    imageIds: seriesImageIds,
    orientation,
    vtkImageData: imageData,
    centerIpp,
    zAxis,
  };

  return imageDataObject;
}

class VTKCrosshairsExample extends Component {
  state = {
    volumes: [],
    displayCrosshairs: true,
  };

  async componentDidMount() {
    this.apis = [];

    // const imageIds = await createStudyImageIds(url, searchInstanceOptions);

    // let ctImageIds = imageIds.filter(imageId =>
    //   imageId.includes(ctSeriesInstanceUID)
    // );

    // const ctImageDataObject = loadDataset(ctImageIds, 'ctDisplaySet');

    const ctImageDataObject = await createImageDataObject();

    const onAllPixelDataInsertedCallback = () => {
      const ctImageData = ctImageDataObject.vtkImageData;

      const range = ctImageData
        .getPointData()
        .getScalars()
        .getRange();

      const mapper = vtkVolumeMapper.newInstance();
      const ctVol = vtkVolume.newInstance();
      const rgbTransferFunction = ctVol.getProperty().getRGBTransferFunction(0);

      mapper.setInputData(ctImageData);
      mapper.setMaximumSamplesPerRay(2000);
      rgbTransferFunction.setRange(range[0], range[1]);
      ctVol.setMapper(mapper);

      this.setState({
        volumes: [ctVol],
      });
    };
    onAllPixelDataInsertedCallback();

    // ctImageDataObject.onAllPixelDataInserted(onAllPixelDataInsertedCallback);
  }

  storeApi = viewportIndex => {
    return api => {
      this.apis[viewportIndex] = api;

      const apis = this.apis;
      const renderWindow = api.genericRenderWindow.getRenderWindow();

      // Add svg widget
      api.addSVGWidget(
        vtkSVGCrosshairsWidget.newInstance(),
        'crosshairsWidget'
      );

      const istyle = vtkInteractorStyleMPRCrosshairs.newInstance();

      // add istyle
      api.setInteractorStyle({
        istyle,
        configuration: { apis, apiIndex: viewportIndex },
      });

      // set blend mode to MIP.
      const mapper = api.volumes[0].getMapper();
      if (mapper.setBlendModeToMaximumIntensity) {
        mapper.setBlendModeToMaximumIntensity();
      }

      api.setSlabThickness(0.1);

      renderWindow.render();

      // Its up to the layout manager of an app to know how many viewports are being created.
      if (apis[0] && apis[1] && apis[2]) {
        //const api = apis[0];

        const api = apis[0];

        api.svgWidgets.crosshairsWidget.resetCrosshairs(apis, 0);
      }
    };
  };

  handleSlabThicknessChange(evt) {
    const value = evt.target.value;
    const valueInMM = value / 10;
    const apis = this.apis;

    apis.forEach(api => {
      const renderWindow = api.genericRenderWindow.getRenderWindow();

      api.setSlabThickness(valueInMM);
      renderWindow.render();
    });
  }

  toggleCrosshairs = () => {
    const { displayCrosshairs } = this.state;
    const apis = this.apis;

    const shouldDisplayCrosshairs = !displayCrosshairs;

    apis.forEach(api => {
      const { svgWidgetManager, svgWidgets } = api;
      svgWidgets.crosshairsWidget.setDisplay(shouldDisplayCrosshairs);

      svgWidgetManager.render();
    });

    this.setState({ displayCrosshairs: shouldDisplayCrosshairs });
  };

  render() {
    if (!this.state.volumes || !this.state.volumes.length) {
      return <h4>Loading...</h4>;
    }

    return (
      <>
        <button onClick={this.toggleCrosshairs}>
          {this.state.displayCrosshairs ? 'Hide Crosshairs' : 'Show Crosshairs'}
        </button>
        <div className="row">
          <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(0)}
              orientation={{ sliceNormal: [0, 1, 0], viewUp: [0, 0, 1] }}
            />
          </div>
          <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(1)}
              orientation={{ sliceNormal: [1, 0, 0], viewUp: [0, 0, 1] }}
            />
          </div>
          <div className="col-sm-4">
            <View2D
              volumes={this.state.volumes}
              onCreated={this.storeApi(2)}
              orientation={{ sliceNormal: [0, 0, 1], viewUp: [0, -1, 0] }}
            />
          </div>
        </div>
      </>
    );
  }
}

export default VTKCrosshairsExample;
