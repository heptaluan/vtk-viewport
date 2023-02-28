import React, { useState, useEffect } from 'react'
import './Header.scss'
import { Button, Image, Space, Alert, Popconfirm, Tooltip } from 'antd'
import { getURLParameters } from '../../util/index'
import { getClinicalFiles, downloadZip } from '../../api/api'
import { RightCircleOutlined, FileDoneOutlined } from '@ant-design/icons'

const Header = props => {
  const [visible, setVisible] = useState(false)
  const [fileData, setFileData] = useState([])
  const [remark, setRemark] = useState('')

  const handleDownLoad = () => {
    downloadZip(getURLParameters(window.location.href).orderId, getURLParameters(window.location.href).resource).then(
      res => {
        const { result, success, message } = res.data
        if (success) {
          window.open(result, '_blank')
        } else {
          message.warning(message)
        }
      }
    )
  }

  useEffect(() => {
    const fetchData = async () => {
      const result = await getClinicalFiles(getURLParameters(window.location.href).orderId)
      if (result.data.code === 500) {
        setFileData([])
      } else if (result.data.code === 200) {
        setFileData(result.data.result.appendix)
        setRemark(result.data.result.remark)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViewClinicalImages = () => {
    setVisible(true)
  }

  return (
    <div className="header-box">
      <div className="user-content">
        {props.data?.patientName && getURLParameters(window.location.href).page === 'image' ? (
          <div className="patient-detail">
            <span>姓名：{props.data.patientName}，</span>
            <span>性别：{props.data.gender_dictText}，</span>
            <span>年龄：{props.data.age}，</span>
            <span>病例编号：{props.data.medicalCaseCode}，</span>
            <span>patientId：{props.data.patientId}，</span>
            <span>检查日期：{props.data.createTime}</span>
          </div>
        ) : null}
      </div>
      {props.pageType === 'review' ? (
        <div className="export-box">
          {remark && remark !== '' ? (
            <div className="tips-box">
              <Alert
                message={`补充说明：${remark}`}
                type="warning"
                action={
                  <Space>
                    {remark.length > 20 ? (
                      <Popconfirm
                        title={
                          <>
                            <div>补充说明</div>
                            <span className="remark-content">{remark}</span>
                          </>
                        }
                        okText="确定"
                      >
                        <Button size="small" type="ghost">
                          显示全部
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </Space>
                }
              />
            </div>
          ) : null}

          {props.historyList?.map((item, index) =>
            item.historyTaskId ? (
              <>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`/ct/viewer/1?&url=/api&taskId=${item.historyTaskId}&orderId=${item.historyOrderId}&resource=${
                    item.historyDicomId
                  }&token=${getURLParameters(window.location.href).token}&user=admin&page=review&from=history`}
                >
                  <Tooltip placement="bottom" title={'历史影像'}>
                    <Button size="small" style={{ marginRight: 10, display: 'flex', alignItems: 'center' }}>
                      <RightCircleOutlined />
                      {item.historyCreateTime.split(' ')[0].replace(/-/g, '')}
                    </Button>
                  </Tooltip>
                </a>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://ai.feipankang.com/preview/${item.historyOrderId}`}
                >
                  <Tooltip placement="bottom" title={'历史报告'}>
                    <Button size="small" style={{ marginRight: 10, display: 'flex', alignItems: 'center' }}>
                      <FileDoneOutlined />
                      {item.historyCreateTime.split(' ')[0].replace(/-/g, '')}
                    </Button>
                  </Tooltip>
                </a>
              </>
            ) : (
              <>
                <Button disabled={true} size="small" style={{ marginRight: 10, display: 'flex', alignItems: 'center' }}>
                  <RightCircleOutlined />
                  {'暂无影像'}
                </Button>
                <Button disabled={true} size="small" style={{ marginRight: 10, display: 'flex', alignItems: 'center' }}>
                  <FileDoneOutlined />
                  {'暂无报告'}
                </Button>
              </>
            )
          )}

          <Button disabled={fileData.length === 0} onClick={handleViewClinicalImages} style={{ marginRight: 10 }}>
            {fileData.length === 0 ? `暂无临床影像` : `查看临床影像（共${fileData.length}页）`}
          </Button>

          <Button onClick={handleDownLoad} style={{ marginRight: 10 }}>
            影像下载
          </Button>

          <Button
            disabled={props.pageState === 'admin' || getURLParameters(window.location.href).from === 'history'}
            type="primary"
            onClick={props.handleShowModal}
          >
            提交审核结果
          </Button>
        </div>
      ) : null}

      <div
        style={{
          display: 'none',
        }}
      >
        <Image.PreviewGroup
          preview={{
            visible,
            onVisibleChange: vis => setVisible(vis),
          }}
        >
          {fileData?.map((item, index) => {
            return <Image key={`${index} - ${item.createTime}`} src={item.fileUrl} />
          })}
        </Image.PreviewGroup>
      </div>
    </div>
  )
}

export default Header
