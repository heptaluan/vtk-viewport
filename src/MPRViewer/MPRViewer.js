import React, { useEffect, useRef } from 'react'
import './MPRViewer.scss'

import { RenderingEngine, Enums, setVolumesForViewports, volumeLoader } from '@cornerstonejs/core'

import { initConfig, setCtTransferFunctionForVolumeActor } from './helpers'

import * as cornerstoneTools from '@cornerstonejs/tools'

const MPRViewer = props => {
  const { ToolGroupManager, Enums: csToolsEnums, CrosshairsTool, StackScrollMouseWheelTool } = cornerstoneTools
  const { MouseBindings } = csToolsEnums
  const { ViewportType } = Enums

  const contentRef = useRef()
  const div1Ref = useRef()
  const div2Ref = useRef()
  const div3Ref = useRef()

  useEffect(() => {
    initConfig()
    initVolume(props.imageIds)
  }, [])

  const initVolume = async imageIds => {
    const volumeName = 'CT_VOLUME_ID'
    const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'
    const volumeId = `${volumeLoaderScheme}:${volumeName}`
    const toolGroupId = 'MY_TOOLGROUP_ID'

    // 禁止右键菜单，以防与 cornerstoneTools 冲突
    div1Ref.current.oncontextmenu = e => e.preventDefault()
    div2Ref.current.oncontextmenu = e => e.preventDefault()
    div3Ref.current.oncontextmenu = e => e.preventDefault()

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

    cornerstoneTools.addTool(StackScrollMouseWheelTool)
    cornerstoneTools.addTool(CrosshairsTool)

    // 缓存 dicom
    const volume = await volumeLoader.createAndCacheVolume(volumeId, {
      imageIds,
    })

    // 初始化渲染引擎
    const renderingEngineId = 'myRenderingEngine'
    const renderingEngine = new RenderingEngine(renderingEngineId)

    // 创建 viewports
    const viewportInputArray = [
      {
        viewportId: viewportId1,
        type: ViewportType.ORTHOGRAPHIC,
        element: div1Ref.current,
        defaultOptions: {
          orientation: Enums.OrientationAxis.AXIAL,
          background: [0, 0, 0],
        },
      },
      {
        viewportId: viewportId2,
        type: ViewportType.ORTHOGRAPHIC,
        element: div2Ref.current,
        defaultOptions: {
          orientation: Enums.OrientationAxis.SAGITTAL,
          background: [0, 0, 0],
        },
      },
      {
        viewportId: viewportId3,
        type: ViewportType.ORTHOGRAPHIC,
        element: div3Ref.current,
        defaultOptions: {
          orientation: Enums.OrientationAxis.CORONAL,
          background: [0, 0, 0],
        },
      },
    ]

    renderingEngine.setViewports(viewportInputArray)

    volume.load()

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

    // 加载十字工具
    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId)
    toolGroup.addViewport(viewportId1, renderingEngineId)
    toolGroup.addViewport(viewportId2, renderingEngineId)
    toolGroup.addViewport(viewportId3, renderingEngineId)
    toolGroup.addTool(StackScrollMouseWheelTool.toolName)

    toolGroup.addTool(CrosshairsTool.toolName, {
      getReferenceLineColor,
      getReferenceLineControllable,
      getReferenceLineDraggableRotatable,
      getReferenceLineSlabThicknessControlsOn,
    })

    toolGroup.setToolActive(CrosshairsTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    })

    // 添加滚动工具
    toolGroup.setToolActive(StackScrollMouseWheelTool.toolName)

    // 最终渲染
    renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3])
  }

  return (
    <div className="mpr-viewer-wrap">
      <div className="mpr-viewer" ref={contentRef} id="content">
        <div className="mpr-box" ref={div1Ref}></div>
        <div className="mpr-box" ref={div2Ref}></div>
        <div className="mpr-box" ref={div3Ref}></div>
      </div>
    </div>
  )
}

export default MPRViewer
