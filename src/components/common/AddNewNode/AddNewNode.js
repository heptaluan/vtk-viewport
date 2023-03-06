import React, { useState } from 'react'
import './AddNewNode.scss'
import { Radio, Select, Button, Input } from 'antd'
import cornerstone from 'cornerstone-core'

const { Option } = Select

const AddNewNode = props => {
  const onLungChange = (e, id) => {
    props.updateToolList(e.target.value, 'lung', id)
  }

  const onLobeChange = (e, id) => {
    props.updateToolList(e.target.value, 'lobe', id)
  }

  const handleSelectChange = (val, id) => {
    props.updateToolList(val, 'type', id)
  }

  return (
    <div className="add-new-node-box">
      <div className="title-box">
        <span className="title">当前帧数：</span>
        <span>
          第{' '}
          {props.imagesConfig.length -
            props.imagesConfig.findIndex(
              index => index === cornerstone.getImage(props.cornerstoneElement).imageId
            )}{' '}
          帧
        </span>
      </div>

      {props.toolList?.map((item, index) => (
        <div className="add-box" key={item.uuid}>
          <div className="list-header">
            结节信息（Area：{parseInt(item.cachedStats.area)}，Mean：{parseInt(item.cachedStats.mean)}，Std Dev：
            {parseInt(item.cachedStats.stdDev)}）
          </div>
          <div className="list">
            <span className="list-title">肺：</span>
            <Radio.Group value={item.lung} onChange={e => onLungChange(e, item.uuid)}>
              <Radio value={'右肺'}>右肺</Radio>
              <Radio value={'左肺'}>左肺</Radio>
            </Radio.Group>
          </div>
          <div className="list">
            <div className="list-title">肺叶：</div>
            <Radio.Group value={item.lobe} onChange={e => onLobeChange(e, item.uuid)}>
              <Radio value={'上叶'}>上叶</Radio>
              {item.lung === '左肺' ? null : <Radio value={'中叶'}>中叶</Radio>}
              <Radio value={'下叶'}>下叶</Radio>
            </Radio.Group>
          </div>
          <div className="list">
            <div className="list-title">类型：</div>
            <Select
              placeholder={'请选择结节类型'}
              value={item.type}
              style={{ width: 200, fontSize: 13 }}
              onChange={e => handleSelectChange(e, item.uuid)}
            >
              <Option value="肺内实性">肺内实性</Option>
              <Option value="部分实性">部分实性</Option>
              <Option value="磨玻璃">磨玻璃</Option>
              <Option value="肺内钙化">肺内钙化</Option>
              <Option value="胸膜实性">胸膜实性</Option>
              <Option value="胸膜钙化">胸膜钙化</Option>
              <Option value="其他">其他</Option>
            </Select>
          </div>
          <div className="list">
            <span className="list-title">建议：</span>
            <Input
              placeholder="这里输入结节备注信息"
              size="small"
              style={{ width: 200, height: 30, marginTop: 2, fontSize: 13 }}
              value={item.suggest}
              onChange={e => props.handleToolListTextareaChange(e, item.uuid)}
              onBlur={e => props.handleToolListTextareaBlur(e, item.uuid)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default AddNewNode
