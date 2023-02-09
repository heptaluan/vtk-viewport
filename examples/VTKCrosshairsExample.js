import React from 'react';
import { Component } from 'react';
import {
  View2D,
  getImageData,
  loadImageData,
  vtkInteractorStyleMPRCrosshairs,
  vtkSVGCrosshairsWidget,
} from '@vtk-viewport';
import { api as dicomwebClientApi } from 'dicomweb-client';
import vtkVolume from 'vtk.js/Sources/Rendering/Core/Volume';
import vtkVolumeMapper from 'vtk.js/Sources/Rendering/Core/VolumeMapper';
import './initCornerstone';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import { vec3 } from 'gl-matrix';

const url = 'https://server.dcmjs.org/dcm4chee-arc/aets/DCM4CHEE/rs';
const studyInstanceUID =
  '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463';
const ctSeriesInstanceUID =
  '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561';
const searchInstanceOptions = {
  studyInstanceUID,
};

function loadDataset(imageIds, displaySetInstanceUid) {
  const imageDataObject = getImageData(imageIds, displaySetInstanceUid);

  loadImageData(imageDataObject);
  return imageDataObject;
}

function createStudyImageIds(baseUrl, studySearchOptions) {
  const SOP_INSTANCE_UID = '00080018';
  const SERIES_INSTANCE_UID = '0020000E';

  const client = new dicomwebClientApi.DICOMwebClient({ url });

  return new Promise((resolve, reject) => {
    client.retrieveStudyMetadata(studySearchOptions).then(instances => {
      const imageIds = instances.map(metaData => {
        const imageId =
          `wadouri:` +
          baseUrl +
          '/studies/' +
          studyInstanceUID +
          '/series/' +
          metaData[SERIES_INSTANCE_UID].Value[0] +
          '/instances/' +
          metaData[SOP_INSTANCE_UID].Value[0] +
          '/frames/1';

        cornerstoneWADOImageLoader.wadors.metaDataManager.add(
          imageId,
          metaData
        );

        return imageId;
      });

      resolve(imageIds);
    }, reject);
  });
}

async function _getSeriesMetaDataMap(seriesImageIds) {
  const metaDataMap = new Map();
  for (let i = 0; i < seriesImageIds.length; i++) {
    const imageId = seriesImageIds[i];
    const metaData = await tryGetMetadataModuleAsync(
      'imagePlaneModule',
      imageId
    );

    metaDataMap.set(imageId, metaData);
  }

  return metaDataMap;
}

async function tryGetMetadataModuleAsync(metadataModule, imageId) {
  // const imageUrl = getUrlForImageId(imageId);
  let imageMetadata = cornerstone.metaData.get(metadataModule, imageId);

  if (!imageMetadata) {
    await cornerstone.loadAndCacheImage(imageId);
    imageMetadata = cornerstone.metaData.get(metadataModule, imageId);
  }

  return imageMetadata;
}

function crossVectors(a, b) {
  let ax = a.x || a[0];
  let ay = a.y || a[1];
  let az = a.z || a[2];

  let bx = b.x || b[0];
  let by = b.y || b[1];
  let bz = b.z || b[2];

  const x = ay * bz - az * by;
  const y = az * bx - ax * bz;
  const z = ax * by - ay * bx;

  return { x, y, z };
}

function determineOrientation(v) {
  let axis;
  const oX = v.x < 0 ? 'R' : 'L';
  const oY = v.y < 0 ? 'A' : 'P';
  const oZ = v.z < 0 ? 'I' : 'S';

  const aX = Math.abs(v.x);
  const aY = Math.abs(v.y);
  const aZ = Math.abs(v.z);
  const obliqueThreshold = 0.8;
  if (aX > obliqueThreshold && aX > aY && aX > aZ) {
    axis = oX;
  } else if (aY > obliqueThreshold && aY > aX && aY > aZ) {
    axis = oY;
  } else if (aZ > obliqueThreshold && aZ > aX && aZ > aY) {
    axis = oZ;
  }

  return axis;
}

function mean(array) {
  return sum(array) / array.length;
}

function sum(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum;
}

function diff(array) {
  let resultArray = [];
  for (let i = 1; i < array.length; i++) {
    resultArray.push(array[i] - array[i - 1]);
  }
  return resultArray;
}

function computeZAxis(orientation, metaData) {
  var ippArray = [];
  const xyzIndex = determineOrientationIndex(orientation);

  for (var value of metaData.values()) {
    let ipp = value.imagePositionPatient;
    if (xyzIndex === 0) {
      ippArray.push(ipp.x || ipp[0]);
    } else if (xyzIndex === 1) {
      ippArray.push(ipp.y || ipp[1]);
    } else {
      ippArray.push(ipp.z || ipp[2]);
    }
  }

  ippArray.sort(function(a, b) {
    return a - b;
  });
  const meanSpacing = mean(diff(ippArray));

  // Find origin from positions
  const originPositionAlongAcqAxis = ippArray[0];
  const originImagePlane = Array.from(metaData.values()).find(meta => {
    return meta.imagePositionPatient[xyzIndex] === originPositionAlongAcqAxis;
  });

  var obj = {
    spacing: meanSpacing,
    positions: ippArray,
    origin: originImagePlane.imagePositionPatient,
    xyzIndex,
  };
  return obj;
}

function determineOrientationIndex(orientation) {
  var o = orientation;
  var index;
  switch (o) {
    case 'A':
    case 'P':
      index = 1;
      break;
    case 'L':
    case 'R':
      index = 0;
      break;
    case 'S':
    case 'I':
      index = 2;
      break;
    default:
      console.assert(false, ' OBLIQUE NOT SUPPORTED');
      break;
  }
  return index;
}

function _calculateDimensions(metaDataMap) {
  const imagePlaneModule = metaDataMap.values().next().value;

  const { rowCosines, columnCosines } = imagePlaneModule;
  const crossProduct = crossVectors(columnCosines, rowCosines);
  const orientation = determineOrientation(crossProduct);
  const zAxis = computeZAxis(orientation, metaDataMap);

  const xSpacing = imagePlaneModule.columnPixelSpacing;
  const ySpacing = imagePlaneModule.rowPixelSpacing;
  const zSpacing = zAxis.spacing;
  const xVoxels = imagePlaneModule.columns;
  const yVoxels = imagePlaneModule.rows;
  const zVoxels = metaDataMap.size;

  // 3 === RGB?
  const multiComponent = imagePlaneModule.numberOfComponents > 1;

  return {
    dimensions: [xVoxels, yVoxels, zVoxels],
    orientation,
    multiComponent,
    spacing: [xSpacing, ySpacing, zSpacing],
    zAxis,
  };
}

function bsearch(array, value, cmp) {
  let low = 0;
  let high = array.length - 1;

  let cmpResult;
  while (low <= high) {
    let mid = low + (((high - low) / 2) | 0); // avoid overflow when low + high > max for type
    cmpResult = cmp(array[mid], value);
    if (cmpResult < 0) {
      low = mid + 1;
    } else if (cmpResult > 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
}

function realsApproximatelyEqual(a, b, eps = 0.00001) {
  return Math.abs(a - b) < eps;
}

function compareReals(a, b, cmp) {
  let eq = realsApproximatelyEqual(a, b);
  if (eq === true) return 0;

  if (a < b) {
    return -1;
  }
  return 1;
}

async function _getTypedPixelArray(imageId, dimensions) {
  const imagePixelModule = await tryGetMetadataModuleAsync(
    'imagePixelModule',
    imageId
  );
  const { bitsAllocated, pixelRepresentation } = imagePixelModule;
  const signed = pixelRepresentation === 1;

  if (bitsAllocated === 8) {
    if (signed) {
      throw new Error(
        '8 Bit signed images are not yet supported by this plugin.'
      );
    } else {
      throw new Error(
        '8 Bit unsigned images are not yet supported by this plugin.'
      );
    }
  }

  let typedPixelArray;
  if (bitsAllocated === 16) {
    // x, y, z
    typedPixelArray = signed
      ? new Int16Array(dimensions[0] * dimensions[1] * dimensions[2])
      : new Uint16Array(dimensions[0] * dimensions[1] * dimensions[2]);
  } else {
    throw new Error(`Unssuported bit: ${bitsAllocated}`);
  }

  return typedPixelArray;
}

function getSliceIndex(zAxis, imagePositionPatient) {
  const x = imagePositionPatient.x || imagePositionPatient[0];
  const y = imagePositionPatient.y || imagePositionPatient[1];
  const z = imagePositionPatient.z || imagePositionPatient[2];

  let sliceIndex = 0;
  if (zAxis.xyzIndex === 0) {
    sliceIndex = bsearch(zAxis.positions, x, compareReals);
  } else if (zAxis.xyzIndex === 1) {
    sliceIndex = bsearch(zAxis.positions, y, compareReals);
  } else {
    sliceIndex = bsearch(zAxis.positions, z, compareReals);
  }

  return sliceIndex;
}

function computeImageDataIncrements(imageData, numberOfComponents) {
  const datasetDefinition = imageData.get('extent', 'spacing', 'origin');
  const inc = [0, 0, 0];
  let incr = numberOfComponents;

  for (let idx = 0; idx < 3; ++idx) {
    inc[idx] = incr;
    incr *=
      datasetDefinition.extent[idx * 2 + 1] -
      datasetDefinition.extent[idx * 2] +
      1;
  }

  return inc;
}

function computeIndex(extent, incs, xyz) {
  return (
    ((xyz[0] - extent[0]) * incs[0] +
      (xyz[1] - extent[2]) * incs[1] +
      (xyz[2] - extent[4]) * incs[2]) |
    0
  );
}

function insertSlice(vtkVolume, pixelData, sliceIndex) {
  const datasetDefinition = vtkVolume.get('extent', 'spacing', 'origin');
  const scalars = vtkVolume.getPointData().getScalars();
  // TODO number of components.
  const increments = computeImageDataIncrements(vtkVolume, 1);
  const scalarData = scalars.getData();
  const indexXYZ = [0, 0, sliceIndex];
  let pixelIndex = 0;

  for (let row = 0; row <= datasetDefinition.extent[3]; row++) {
    indexXYZ[1] = row;
    for (let col = 0; col <= datasetDefinition.extent[1]; col++) {
      indexXYZ[0] = col;

      const destIdx = computeIndex(
        datasetDefinition.extent,
        increments,
        indexXYZ
      );
      scalarData[destIdx] = pixelData[pixelIndex++];
    }
  }
  vtkVolume.modified();
}

async function _createVtkVolume(seriesImageIds, dimensions, spacing, zAxis) {
  const vtkVolume = vtkImageData.newInstance();
  const typedPixelArray = await _getTypedPixelArray(
    seriesImageIds[0],
    dimensions
  );
  const scalarArray = vtkDataArray.newInstance({
    name: 'Pixels',
    numberOfComponents: 1,
    values: typedPixelArray,
  });

  // TODO: Is this a better place to set this?
  console.log('VOLUME ORIGIN: ', zAxis.origin);
  // Our recommended three-step method for
  // handling DICOM coordinates in VTK are to undo any vertical flip applied to the data by the reader, set the
  // origin to zero, and build the above 4×4 matrix from the DICOM metadata.
  // vtkVolume.setOrigin(zAxis.origin)
  vtkVolume.setOrigin([0, 0, 0]); // zMax * zPixelSpacing
  vtkVolume.setDimensions(dimensions);
  vtkVolume.setSpacing(spacing);
  vtkVolume.getPointData().setScalars(scalarArray);

  // Add our slices
  for (let i = 0; i < seriesImageIds.length; i++) {
    const imageId = seriesImageIds[i];
    // const imageUrl = getUrlForImageId(imageId);
    const image = await cornerstone.loadAndCacheImage(imageId);
    const { imagePositionPatient } = await tryGetMetadataModuleAsync(
      'imagePlaneModule',
      imageId
    );
    const sliceIndex = getSliceIndex(zAxis, imagePositionPatient);

    insertSlice(vtkVolume, image.getPixelData(), sliceIndex);

    // TODO: Inverting Slice Index: Vertical flips sagittal/coronal
    // const flipped = Math.abs(sliceIndex - seriesImageIds.length);
    // insertSlice(vtkVolume, image.getPixelData().reverse(), flipped);

    // TODO: .reverse() vertically flips axial
    // TODO: Flip x/y spacing because of flip?
    // insertSlice(vtkVolume, image.getPixelData().reverse(), sliceIndex);
  }

  // TODO: We can accidentally create multiple volumes if we try to create one
  // Before a request for the same series has completed.
  // (You'll notice this logs 3x -- one for each initial MPR canvas, but 0x after any load has finished)
  // console.log('~~~~~~~~~~ VTK VOLUME:', vtkVolume);
  return vtkVolume;
}

function _getVolumeCenterIpp(vtkImageData) {
  const [x0, y0, z0] = vtkImageData.getOrigin();
  const [xSpacing, ySpacing, zSpacing] = vtkImageData.getSpacing();
  const [xMin, xMax, yMin, yMax, zMin, zMax] = vtkImageData.getExtent();

  const centerOfVolume = vec3.fromValues(
    x0 + xSpacing * 0.5 * (xMin + xMax),
    y0 + ySpacing * 0.5 * (yMin + yMax),
    z0 + zSpacing * 0.5 * (zMin + zMax)
  );

  return centerOfVolume;
}

async function init() {
  const seriesImageIds = [
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQV_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQU_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQT_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQS_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQR_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQQ_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQP_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQO_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQN_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQM_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQL_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQK_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQJ_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQI_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQH_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQG_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQF_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQE_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQD_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQC_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQB_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAQA_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP9_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP8_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP7_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP6_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP5_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP4_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP3_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP2_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP1_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP0_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAP__20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPZ_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPY_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPX_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPW_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPV_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPU_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPT_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPS_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPR_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPQ_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPP_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPO_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPN_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPM_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPL_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPK_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPJ_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPI_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPH_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPG_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPF_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPE_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPD_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPC_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPB_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAPA_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO9_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO8_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO7_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO6_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO5_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO4_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO3_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO2_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO1_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO0_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAO__20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOZ_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOY_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOX_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOW_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOV_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOU_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOT_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOS_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOR_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOQ_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOP_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOO_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAON_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOM_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOL_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOK_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOJ_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOI_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOH_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOG_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOF_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOE_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOD_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOC_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOB_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAOA_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN9_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN8_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN7_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN6_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN5_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN4_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN3_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN2_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN1_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN0_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAN__20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANZ_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANY_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANX_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANW_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANV_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANU_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANT_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANS_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANR_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANQ_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANP_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANO_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANN_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANM_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANL_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANK_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANJ_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANI_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANH_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANG_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANF_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANE_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAND_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANC_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANB_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAANA_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM9_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM8_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM7_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM6_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM5_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM4_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM3_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM2_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM1_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM0_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAM__20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMZ_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMY_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMX_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMW_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMV_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMU_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMT_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMS_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMR_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMQ_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMP_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMO_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMN_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMM_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAML_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMK_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMJ_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMI_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMH_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMG_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMF_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAME_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMD_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMC_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMB_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAMA_20221014111304.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL9_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL8_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL7_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL6_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL5_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL4_20221014111303.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL3_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL2_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL1_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL0_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAL__20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALZ_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALY_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALX_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALW_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALV_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALU_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALT_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALS_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALR_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALQ_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALP_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALO_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALN_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALM_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALL_20221014111306.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALK_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALJ_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALI_20221014111302.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALH_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALG_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALF_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALE_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALD_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALC_20221014111301.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALB_20221014111254.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAALA_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK9_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK8_20221014111259.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK7_20221014111256.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK6_20221014111300.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK5_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK4_20221014111258.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK3_20221014111252.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK2_20221014111305.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK1_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK0_20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAK__20221014111255.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAKZ_20221014111253.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAKY_20221014111257.dcm',
    'wadouri://im.ananpan.com/omics/image/QDS/2022/9/HuJianQuan/20221014111252/ds_AAAAAAKX_20221014111305.dcm',
  ];

  const metaDataMap = await _getSeriesMetaDataMap(seriesImageIds);

  const {
    dimensions,
    orientation,
    multiComponent,
    spacing,
    zAxis,
  } = _calculateDimensions(metaDataMap);

  // if (multiComponent) {
  //   throw new Error('Multi component image not supported by this plugin.');
  // }

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

    const ctImageDataObject = await init();
    // const imageIds = await createStudyImageIds(url, searchInstanceOptions);

    // let ctImageIds = imageIds.filter(imageId =>
    //   imageId.includes(ctSeriesInstanceUID)
    // );

    // const ctImageDataObject = loadDataset(ctImageIds, 'ctDisplaySet');

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
        <div className="row">
          <div className="col-xs-4">
            <p>
              This example demonstrates how to use the Crosshairs manipulator.
            </p>
            <label htmlFor="set-slab-thickness">SlabThickness: </label>
            <input
              id="set-slab-thickness"
              type="range"
              name="points"
              min="1"
              max="5000"
              onChange={this.handleSlabThicknessChange.bind(this)}
            />
          </div>
          <div className="col-xs-4">
            <p>Click bellow to toggle crosshairs on/off.</p>
            <button onClick={this.toggleCrosshairs}>
              {this.state.displayCrosshairs
                ? 'Hide Crosshairs'
                : 'Show Crosshairs'}
            </button>
          </div>
        </div>
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
