import React, { useState, useEffect } from 'react'
import './Toolbar.scss'
import IconFont from '../common/IconFont/index'
import { Tooltip, Button, Slider, InputNumber } from 'antd'
import { getURLParameters } from '../../util/index'
import { QuestionCircleOutlined } from '@ant-design/icons'

const toolbarList = [
  {
    id: 1,
    text: '自动播放',
    icon: <IconFont style={{ fontSize: '24px' }} type="icon-asmkticon0229" />,
    type: 'playClip',
    checked: false,
    filter: true,
  },
  {
    id: 2,
    text: '垂直翻转',
    icon: <IconFont style={{ fontSize: '20px' }} type="icon-fanzhuan1" />,
    type: 'vflip',
    checked: false,
    filter: true,
  },
  {
    id: 3,
    text: '水平翻转',
    icon: <IconFont style={{ fontSize: '20px' }} type="icon-fanzhuan" />,
    type: 'hflip',
    checked: false,
    filter: true,
  },
  {
    id: 4,
    text: '放大',
    icon: <IconFont style={{ fontSize: '26px' }} type="icon-fangda" />,
    type: 'Magnify',
    checked: false,
  },
  // {
  //   id: 5,
  //   text: '聚焦',
  //   icon: <IconFont style={{ fontSize: '24px' }} type="icon-jujiao" />,
  //   type: 'focus',
  //   checked: false,
  // },
  {
    id: 6,
    type: 'hr',
  },
  {
    id: 7,
    text: '圆形',
    icon: <IconFont style={{ fontSize: '24px' }} type="icon-yuanxing" />,
    type: 'EllipticalRoi',
    checked: false,
  },
  // {
  //   id: 8,
  //   text: '矩形',
  //   icon: <IconFont style={{ fontSize: '24px' }} type="icon-juxing" />,
  //   type: 'RectangleRoi',
  //   checked: false,
  // },
  {
    id: 9,
    text: '角度选择',
    icon: <IconFont style={{ fontSize: '18px' }} type="icon-jiaoduceliang" />,
    type: 'Angle',
    checked: false,
  },
  {
    id: 10,
    text: '尺子',
    icon: <IconFont style={{ fontSize: '22px' }} type="icon-02-chizi" />,
    type: 'Length',
    checked: false,
  },
  {
    id: 11,
    text: '缩放',
    icon: <IconFont style={{ fontSize: '18px' }} type="icon-zoom" />,
    type: 'Zoom',
    checked: false,
  },
  {
    id: 12,
    text: '平移',
    icon: <IconFont style={{ fontSize: '18px' }} type="icon-move" />,
    type: 'Pan',
    checked: false,
  },
  {
    id: 13,
    type: 'hr',
  },
  {
    id: 14,
    text: '复原图像',
    icon: <IconFont style={{ fontSize: '18px' }} type="icon-reset_defalut" />,
    type: 'Reset',
    checked: false,
  },
  {
    id: 15,
    text: '清除标注',
    icon: <IconFont style={{ fontSize: '18px' }} type="icon-qingchuhuancun" />,
    type: 'Eraser',
    checked: false,
  },
  {
    id: 16,
    type: 'hr',
  },
  {
    id: 17,
    text: '结节标注',
    icon: <IconFont style={{ fontSize: '24px' }} type="icon-juxing" />,
    type: 'RectangleRoi',
    checked: false,
  },
  {
    id: 18,
    text: '面积测量',
    icon: <IconFont style={{ fontSize: '16px' }} type="icon-celiang" />,
    type: 'MeasureRect',
    checked: false,
  },
]

const Toolbar = props => {
  const [state, setstate] = useState(toolbarList)
  const [inputValue, setInputValue] = useState(null)

  const handleToolbarClick = (e, index, type) => {
    if (type === 'playClip' || type === 'vflip' || type === 'hflip') {
      state[index].checked = !state[index].checked
      setstate([...state])
    } else if (type === 'Reset') {
      props.handleToolbarClick(type, state[index].checked)
      state.map(item => {
        if (item.type === 'vflip' || item.type === 'hflip') item.checked = false
      })
      setstate([...state])
      return
    } else {
      state[index].checked = !state[index].checked
      state.map(item => {
        if (item.type !== type && item.type !== 'playClip' && item.type !== 'vflip' && item.type !== 'hflip')
          item.checked = false
      })
      setstate([...state])
    }

    // 父组件传值
    props.handleToolbarClick(type, state[index].checked)
  }

  useEffect(() => {
    const diameterMaxSize = localStorage.getItem('diameterSize')
    if (diameterMaxSize && diameterMaxSize !== '') {
      setInputValue(diameterMaxSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 滑块滑动事件
  const handleSliderChange = newValue => {
    setInputValue(newValue)
    localStorage.setItem('diameterSize', newValue)
    props.handleSliderChange(newValue)
  }

  return (
    <ul className="tool-bar-box-wrap">
      <div className="tool-bar-box">
        {toolbarList.map((item, index) => {
          return item.type === 'hr' ? (
            <li key={item.id} className="hr">
              <div></div>
            </li>
          ) : (
            <li
              id={item.type === 'MarkNodule' && item.checked ? 'mark' : null}
              key={item.id}
              className={item.checked ? (item.filter ? 'filter-active' : 'active') : ''}
              onClick={e => handleToolbarClick(e, index, item.type)}
              data-type={item.type}
            >
              <Tooltip title={item.text}>{item.icon}</Tooltip>
            </li>
          )
        })}
      </div>

      <div className="submit-btn">
        <Button onClick={e => props.handleShowMarker(e)} size="small">
          {props.showMarker ? '隐藏标注' : '显示标注'}
        </Button>

        {getURLParameters(window.location.href).page === 'review' &&
        getURLParameters(window.location.href).user !== 'admin' ? (
          <>
            <Button onClick={e => props.handleSubmitNodeDetail(e)} size="small">
              新增结节
            </Button>
            <div className="slider-box">
              <Slider min={1} max={10} onChange={handleSliderChange} value={inputValue} size="small" />
              <InputNumber addonAfter="mm" disabled min={0} max={10} step={1} value={inputValue} size="small" />
              <Tooltip title="小于滑块所选值的为微小结节">
                <QuestionCircleOutlined />
              </Tooltip>
            </div>
          </>
        ) : null}
      </div>
    </ul>
  )
}

export default Toolbar
