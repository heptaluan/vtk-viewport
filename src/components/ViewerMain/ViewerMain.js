import React from 'react'
import CornerstoneViewport from 'react-cornerstone-viewport'
import './ViewerMain.scss'
import useWindowSize from '../../hook/useWindowSize'
import Toolbar from '../../components/Toolbar/Toolbar'
import CustomOverlay from '../common/CustomOverlay/CustomOverlay'
import { Spin } from 'antd'

const ViewerMain = props => {
  const size = useWindowSize()
  return (
    <div className="viewer-main-box">
      {props.imagesConfig.length === 0 ? (
        <div className="error-tips">
          <Spin tip="加载失败，请重新尝试" />
        </div>
      ) : (
        <div>
          <Toolbar
            handleSliderChange={props.handleSliderChange}
            handleToolbarClick={props.handleToolbarClick}
            handleSubmitNodeDetail={props.handleSubmitNodeDetail}
            handleShowMarker={props.handleShowMarker}
            showMarker={props.showMarker}
          />
          <CornerstoneViewport
            imageIdIndex={props.imageIdIndex}
            viewportOverlayComponent={CustomOverlay}
            onElementEnabled={elementEnabledEvt => props.handleElementEnabledEvt(elementEnabledEvt)}
            tools={props.toolsConfig}
            imageIds={props.imagesConfig}
            style={{
              minWidth: '100%',
              height: props.pageType === 'detail' ? `${size.height}px` : `${size.height - 85}px`,
              flex: '1',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default ViewerMain
