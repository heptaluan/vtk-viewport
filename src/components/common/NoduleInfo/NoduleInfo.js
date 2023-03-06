import React, { useState, useEffect } from 'react'
import './NoduleInfo.scss'
import { Radio, Select, Button, Input, InputNumber, Modal } from 'antd'
import { getURLParameters, formatMiniNode } from '../../../util/index'

const { TextArea } = Input

const { Option } = Select

const NoduleInfo = props => {
  const [btnGroup, setBtnGroup] = useState([
    {
      id: 0,
      val: 0,
      checked: true,
    },
    {
      id: 1,
      val: 1,
      checked: false,
    },
    {
      id: 2,
      val: 2,
      checked: false,
    },
    {
      id: 3,
      val: 3,
      checked: false,
    },
    {
      id: 4,
      val: 4,
      checked: false,
    },
    {
      id: 5,
      val: 5,
      checked: false,
    },
    {
      id: 6,
      val: 6,
      checked: false,
    },
    {
      id: 7,
      val: 7,
      checked: false,
    },
    {
      id: 8,
      val: 8,
      checked: false,
    },
    {
      id: 9,
      val: 9,
      checked: false,
    },
  ])

  const [riskData, setRiskData] = useState(0)

  useEffect(() => {
    if (props.noduleInfo) {
      setRiskData(parseInt(props.noduleInfo.scrynMaligant))
    }
  }, [props.noduleInfo])

  useEffect(() => {
    if (props.noduleInfo?.scrynMaligant) {
      let num = 0
      const risk = parseInt(props.noduleInfo.scrynMaligant)
      if (risk < 10) {
        num = 0
      } else {
        num = parseInt(risk / 10)
      }
      handleSetButtonActive(num)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.noduleInfo])

  const onLungChange = e => {
    props.checkNoduleList(e.target.value, 'lung')
    if (e.target.value === '左肺' && props.noduleInfo.lobe === '中叶') {
      props.checkNoduleList('上叶', 'lobe')
    }
  }

  const onLobeChange = e => {
    props.checkNoduleList(e.target.value, 'lobe')
  }

  const handleSelectChange = val => {
    props.checkNoduleList(val, 'type')
  }

  const handleSoakChange = val => {
    props.checkNoduleList(val, 'soak')
  }

  // 风险值输入框事件
  const handleRiskInputChange = val => {
    handleSetButtonActive(parseInt(Number(val / 10)))
    setRiskData(val)
    props.handleUpdateRisk(val, 'inputChange')
  }

  const handleRishInputBlur = e => {
    handleSetButtonActive(parseInt(Number(e.target.value / 10)))
    props.handleUpdateRisk(Number(e.target.value))
  }

  // 设置当中按钮选中
  const handleSetButtonActive = num => {
    if (isNaN(num)) {
      return false
    }
    if (num > 9 || num < 0) {
      return false
    }
    btnGroup.map(item => (item.checked = false))
    const item = btnGroup.find(item => item.id === num)
    item.checked = true
    setBtnGroup([...btnGroup])
  }

  const handleRishButtonClick = val => {
    handleSetButtonActive(val)
    const curRisk = val * 10 + Math.floor(Math.random() * 10)
    setRiskData(curRisk)
    props.handleUpdateRisk(Number(curRisk))
  }

  return (
    <div className="nodule-info-box">
      {props.noduleInfo ? (
        <div className="nodule-detail">
          <div className="list">
            <span className="list-title">肺：</span>
            <Radio.Group disabled={props.pageState === 'admin'} onChange={onLungChange} value={props.noduleInfo.lung}>
              <Radio value={'右肺'}>右肺</Radio>
              <Radio value={'左肺'}>左肺</Radio>
            </Radio.Group>
          </div>

          <div className="list">
            <div className="list-title">肺叶：</div>
            <Radio.Group disabled={props.pageState === 'admin'} onChange={onLobeChange} value={props.noduleInfo.lobe}>
              <Radio value={'上叶'}>上叶</Radio>
              {props.noduleInfo.lung === '左肺' ? null : <Radio value={'中叶'}>中叶</Radio>}
              <Radio value={'下叶'}>下叶</Radio>
            </Radio.Group>
          </div>

          <div className="list">
            <div className="list-title">类型：</div>
            <Select
              disabled={props.pageState === 'admin'}
              size="small"
              value={props.noduleInfo.type}
              style={{ width: 185, fontSize: 13 }}
              onChange={handleSelectChange}
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

          {props.noduleInfo.newSoak ? (
            <div className="list" style={{ marginTop: 3 }}>
              <div className="list-title">浸润类型：</div>
              <Select
                disabled="disabled"
                size="small"
                value={props.noduleInfo.newSoak}
                style={{ width: 185, fontSize: 13 }}
                onChange={handleSoakChange}
              >
                <Option value="AAH">AAH（非典型腺瘤样增生）</Option>
                <Option value="AIS">AIS（原位腺癌）</Option>
                <Option value="MIA">MIA（微浸润性腺癌）</Option>
                <Option value="IA">IA（浸润性腺癌）</Option>
                <Option value="OTHER">OTHER（其他）</Option>
              </Select>
            </div>
          ) : null}

          <div className="list">
            <em>大小：</em>
            {props.noduleInfo.nodeType === 1 ? (
              <>{formatMiniNode(props.noduleInfo.diameter)}</>
            ) : (
              <>{props.noduleInfo.diameter ? props.noduleInfo.diameter : '-'}</>
            )}
          </div>

          {props.noduleInfo.newDiameter ? (
            <div className="list">
              <em>大小调整后：</em>
              {props.noduleInfo.nodeType === 1 ? (
                <span style={{ color: '#ff4d4f' }}>{formatMiniNode(props.noduleInfo.diameter)}</span>
              ) : (
                <span style={{ color: '#ff4d4f' }}>{formatMiniNode(props.noduleInfo.newDiameter)}</span>
              )}
            </div>
          ) : null}

          <div className="list">
            <em>体积：</em>
            {props.noduleInfo.noduleSize ? props.noduleInfo.noduleSize : '-'} mm³
          </div>

          {props.noduleInfo.newNoduleSize ? (
            <div className="list">
              <em>体积调整后：</em>
              {props.noduleInfo.nodeType === 1 ? (
                <span style={{ color: '#ff4d4f' }}>
                  {props.noduleInfo.noduleSize ? props.noduleInfo.noduleSize : '-'} mm³
                </span>
              ) : (
                <span style={{ color: '#ff4d4f' }}>
                  {props.noduleInfo.newNoduleSize ? props.noduleInfo.newNoduleSize : '-'} mm³
                </span>
              )}
            </div>
          ) : null}

          <div className="list adjust">
            <Button disabled={props.pageState === 'admin'} size="small" onClick={props.handleShowAdjustModal}>
              调整
            </Button>

            <Button
              disabled={props.pageState === 'admin'}
              size="small"
              style={{ marginLeft: 10 }}
              onClick={props.handleShowMarkModal}
            >
              标记微小结节
            </Button>
          </div>

          <div className="list">
            <em>恶性风险：</em>
            {props.noduleInfo.risk ? `${props.noduleInfo.risk}%` : '-'}
            <InputNumber
              addonAfter="%"
              disabled={props.pageState === 'admin'}
              placeholder="请输入风险值"
              size="small"
              style={{ width: 110, height: 24, marginTop: 2, marginLeft: 18, fontSize: 13 }}
              onChange={val => handleRiskInputChange(val)}
              onBlur={e => handleRishInputBlur(e)}
              value={riskData}
              min={1}
              max={99}
            />
          </div>

          <div className="list list-btn-box">
            {btnGroup.map((item, index) => (
              <div className="list-btn-group" key={item.id}>
                <Button
                  disabled={props.pageState === 'admin'}
                  type={item.checked === true ? 'primary' : null}
                  size="small"
                  onClick={e => handleRishButtonClick(item.val)}
                >
                  {item.val}
                </Button>
              </div>
            ))}
          </div>

          <div className="list" style={{ marginBottom: 8, height: 'auto' }}>
            <em>备注：</em>
            <TextArea
              rows={4}
              disabled={props.pageState === 'admin'}
              placeholder="请输入结节备注信息"
              size="small"
              style={{ width: 205, marginTop: 2, fontSize: 13, resize: 'none', minHeight: 85 }}
              onChange={props.handleTextareaOnChange}
              onBlur={props.handleInputBlur}
              value={props.noduleInfo?.suggest}
            />
          </div>
        </div>
      ) : null}

      {props.noduleInfo ? (
        <div className="check-group">
          <div className="group-wrap">
            <span>是否为结节</span>
            <div className="group">
              <Button
                disabled={props.pageState === 'admin'}
                type={props.noduleInfo.state === false ? 'primary' : null}
                style={{ marginRight: '15px' }}
                size="small"
                onClick={e => props.updateNoduleList(false)}
              >
                否
              </Button>
              <Button
                disabled={props.pageState === 'admin'}
                type={props.noduleInfo.state === true ? 'primary' : null}
                size="small"
                onClick={e => props.updateNoduleList(true)}
              >
                是
              </Button>
            </div>
          </div>
          {getURLParameters(window.location.href).user === 'chief_lwx' ? (
            <>
              <div className="group-wrap" style={{ marginTop: 5 }}>
                <span>是否已复核</span>
                <div className="group">
                  <Button
                    disabled={props.pageState === 'admin'}
                    type={props.noduleInfo.chiefReview === false ? 'primary' : null}
                    style={{ marginRight: '15px' }}
                    size="small"
                    onClick={e => props.updateChiefNoduleList(false)}
                  >
                    否
                  </Button>
                  <Button
                    disabled={props.pageState === 'admin'}
                    type={props.noduleInfo.chiefReview === true ? 'primary' : null}
                    size="small"
                    onClick={e => props.updateChiefNoduleList(true)}
                  >
                    是
                  </Button>
                </div>
              </div>
              {/* <div className="group-wrap" style={{ marginTop: 5 }}>
                <span>是否标记为良性样本</span>
                <div className="group">
                  <Button
                    disabled={props.pageState === 'admin'}
                    type={props.noduleInfo.markNode === false ? 'primary' : null}
                    style={{ marginRight: '15px' }}
                    size="small"
                    onClick={e => props.updateChiefMarkNode(false)}
                  >
                    否
                  </Button>
                  <Button
                    disabled={props.pageState === 'admin'}
                    type={props.noduleInfo.markNode === true ? 'primary' : null}
                    size="small"
                    onClick={e => props.updateChiefMarkNode(true)}
                  >
                    是
                  </Button>
                </div>
              </div> */}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default NoduleInfo
