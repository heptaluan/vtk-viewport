import React from 'react'
import './LeftSidePanel.scss'

const LeftSidePanel = props => {
  return (
    <div className="left-side-panel-box">
      <div className="list-box-wrap">
        <div className="list-box">
          {props.data?.length === 0 ? (
            <div className="empty">暂无序列</div>
          ) : (
            props.data?.map((item, index) => (
              <div key={item.id} className="list-item" onClick={e => props.handleSequenceListClick(item.instanceUid)}>
                <div className="num">序列：{item.seriesDescription}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default LeftSidePanel
