import React, { useEffect } from 'react'
import './MPRViewer.scss'

import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  getRenderingEngine,
} from '@cornerstonejs/core'

import {
  initConfig,
  setCtTransferFunctionForVolumeActor,
  addDropdownToToolbar,
} from './helpers'

import * as cornerstoneTools from '@cornerstonejs/tools'

const MPRViewer = () => {
  const { ToolGroupManager, Enums: csToolsEnums, CrosshairsTool, StackScrollMouseWheelTool } = cornerstoneTools

  const { MouseBindings } = csToolsEnums
  const { ViewportType } = Enums

  useEffect(() => {
    // Define a unique id for the volume
    const volumeName = 'CT_VOLUME_ID' // Id of the volume less loader prefix
    const volumeLoaderScheme = 'cornerstoneStreamingImageVolume' // Loader id which defines which volume loader to use
    const volumeId = `${volumeLoaderScheme}:${volumeName}` // VolumeId with loader id + volume id
    const toolGroupId = 'MY_TOOLGROUP_ID'

    const size = '500px'
    const content = document.getElementById('content')
    const viewportGrid = document.createElement('div')

    viewportGrid.style.display = 'flex'
    viewportGrid.style.display = 'flex'
    viewportGrid.style.flexDirection = 'row'

    const element1 = document.createElement('div')
    const element2 = document.createElement('div')
    const element3 = document.createElement('div')
    element1.style.width = size
    element1.style.height = size
    element2.style.width = size
    element2.style.height = size
    element3.style.width = size
    element3.style.height = size

    // Disable right click context menu so we can have right click tools
    element1.oncontextmenu = e => e.preventDefault()
    element2.oncontextmenu = e => e.preventDefault()
    element3.oncontextmenu = e => e.preventDefault()

    viewportGrid.appendChild(element1)
    viewportGrid.appendChild(element2)
    viewportGrid.appendChild(element3)

    content.appendChild(viewportGrid)

    // ============================= //

    const viewportId1 = 'CT_AXIAL'
    const viewportId2 = 'CT_SAGITTAL'
    const viewportId3 = 'CT_CORONAL'

    const viewportColors = {
      [viewportId1]: 'rgb(200, 0, 0)',
      [viewportId2]: 'rgb(200, 200, 0)',
      [viewportId3]: 'rgb(0, 200, 0)',
    }

    const viewportReferenceLineControllable = [viewportId1, viewportId2, viewportId3]

    const viewportReferenceLineDraggableRotatable = [viewportId1, viewportId2, viewportId3]

    const viewportReferenceLineSlabThicknessControlsOn = [viewportId1, viewportId2, viewportId3]

    function getReferenceLineColor(viewportId) {
      return viewportColors[viewportId]
    }

    function getReferenceLineControllable(viewportId) {
      const index = viewportReferenceLineControllable.indexOf(viewportId)
      return index !== -1
    }

    function getReferenceLineDraggableRotatable(viewportId) {
      const index = viewportReferenceLineDraggableRotatable.indexOf(viewportId)
      return index !== -1
    }

    function getReferenceLineSlabThicknessControlsOn(viewportId) {
      const index = viewportReferenceLineSlabThicknessControlsOn.indexOf(viewportId)
      return index !== -1
    }

    async function run() {

      await initConfig()

      cornerstoneTools.addTool(StackScrollMouseWheelTool)
      cornerstoneTools.addTool(CrosshairsTool)

      const imageIds = [
        'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOE_20221016235836.dcm',
        'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOD_20221016235826.dcm',
        'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOC_20221016235827.dcm',
        'wadouri://im.ananpan.com/omics/image/QDS/2022/9/TangZongLin/20221016235825/ds_AAAAAAOB_20221016235836.dcm',
      ]

      // Define a volume in memory
      const volume = await volumeLoader.createAndCacheVolume(volumeId, {
        imageIds,
      })

      // Instantiate a rendering engine
      const renderingEngineId = 'myRenderingEngine'
      const renderingEngine = new RenderingEngine(renderingEngineId)

      // Create the viewports
      const viewportInputArray = [
        {
          viewportId: viewportId1,
          type: ViewportType.ORTHOGRAPHIC,
          element: element1,
          defaultOptions: {
            orientation: Enums.OrientationAxis.AXIAL,
            background: [0, 0, 0],
          },
        },
        {
          viewportId: viewportId2,
          type: ViewportType.ORTHOGRAPHIC,
          element: element2,
          defaultOptions: {
            orientation: Enums.OrientationAxis.SAGITTAL,
            background: [0, 0, 0],
          },
        },
        {
          viewportId: viewportId3,
          type: ViewportType.ORTHOGRAPHIC,
          element: element3,
          defaultOptions: {
            orientation: Enums.OrientationAxis.CORONAL,
            background: [0, 0, 0],
          },
        },
      ]

      renderingEngine.setViewports(viewportInputArray)

      // Set the volume to load
      volume.load()

      // Set volumes on the viewports
      await setVolumesForViewports(
        renderingEngine,
        [
          {
            volumeId,
            callback: setCtTransferFunctionForVolumeActor,
          },
        ],
        [viewportId1, viewportId2, viewportId3]
      )

      // Define tool groups to add the segmentation display tool to
      const toolGroup = ToolGroupManager.createToolGroup(toolGroupId)

      // For the crosshairs to operate, the viewports must currently be
      // added ahead of setting the tool active. This will be improved in the future.
      toolGroup.addViewport(viewportId1, renderingEngineId)
      toolGroup.addViewport(viewportId2, renderingEngineId)
      toolGroup.addViewport(viewportId3, renderingEngineId)

      // Manipulation Tools
      toolGroup.addTool(StackScrollMouseWheelTool.toolName)
      // Add Crosshairs tool and configure it to link the three viewports
      // These viewports could use different tool groups. See the PET-CT example
      // for a more complicated used case.
      toolGroup.addTool(CrosshairsTool.toolName, {
        getReferenceLineColor,
        getReferenceLineControllable,
        getReferenceLineDraggableRotatable,
        getReferenceLineSlabThicknessControlsOn,
      })

      toolGroup.setToolActive(CrosshairsTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      })
      // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
      // hook instead of mouse buttons, it does not need to assign any mouse button.
      toolGroup.setToolActive(StackScrollMouseWheelTool.toolName)

      // Render the image
      renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3])
    }

    run()
  }, [])

  return (
    <div className="App">
      <div id="demo-title-container">
        <h1 id="demo-title"></h1>
      </div>
      <div id="demo-description-container">
        <p id="demo-description"></p>
      </div>
      <div id="demo-toolbar"></div>
      <div id="content"></div>
    </div>
  )
}

export default MPRViewer
