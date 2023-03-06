import React, { useState } from 'react'
import './MarkDialog.scss'
import { Radio, Button } from 'antd'
import { Select } from 'antd'
import IconFont from '../../common/IconFont/index'

const { Option } = Select

const MarkDialog = props => {
  const [radioVal, setRadioVal] = useState(2)
  const [selectVal, setSelectVal] = useState(null)
  const [disabled, setDisabled] = useState(true)

  const handleRadioChange = e => {
    setRadioVal(e.target.value)
  }

  const handleSelectChange = value => {
    setSelectVal(value)
    if (value) {
      setDisabled(false)
    }
  }

  const handleCloselick = () => {
    props.handleCloseCallback()
  }

  const handleButtonClick = () => {
    props.handleSubmitCallback(selectVal)
  }

  return (
    <div className="mark-dialog-wrap">
      <div className="mark-dialog-box">
        <div className="mark-title">
          <span>标注选择</span>
          <span className="close" onClick={handleCloselick}>
            <IconFont style={{ fontSize: '24px' }} type="icon-searchclose" />
          </span>
        </div>
        <div className="mark-content">
          <Radio.Group onChange={handleRadioChange} value={radioVal}>
            <Radio disabled={'disabled'} value={1}>
              AI检测
            </Radio>
            <Radio value={2}>简单标注</Radio>
          </Radio.Group>
        </div>
        <div className="mark-btn-group">
          {radioVal === 1 ? (
            <div className="tab-one">
              <Button type="primary">立即检测</Button>
              <Button type="primary">加入待检测列表</Button>
            </div>
          ) : (
            <div className="tab-two">
              <Select defaultValue="请选择节点类型" style={{ width: 200 }} onChange={handleSelectChange}>
                <Option value="1">肺内实性</Option>
                <Option value="2">部分实性</Option>
                <Option value="3">磨玻璃</Option>
              </Select>
              <Button disabled={disabled} type="primary" onClick={handleButtonClick}>
                确定
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MarkDialog
