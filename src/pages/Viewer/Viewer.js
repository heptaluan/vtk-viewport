import React, { useState, useEffect, useRef } from 'react'
import './Viewer.scss'
import Header from '../../components/Header/Header'
// import LeftSidePanel from '../../components/LeftSidePanel/LeftSidePanel'
import ViewerMain from '../../components/ViewerMain/ViewerMain'
import MiddleSidePanel from '../../components/MiddleSidePanel/MiddleSidePanel'
import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import NoduleInfo from '../../components/common/NoduleInfo/NoduleInfo'
import MarkNoduleTool from '../../components/common/MarkNoduleTool/MarkNoduleTool'
import MeasureRectTool from '../../components/common/MeasureRect/MeasureRect'
import MarkDialog from '../../components/common/MarkDialog/MarkDialog'
import {
  saveDnResult,
  getImageList,
  getNodeList,
  getPatientsList,
  getDoctorTask,
  getDoctorHistoryTask,
  addNewNodeList,
  updateDnResult,
  updateSuperDoctorResult,
  updateDnResultTemp,
  getDnReslutByOrderIdUrl,
} from '../../api/api'
import { getURLParameters, formatMiniNodule } from '../../util/index'
import { Modal, message, Button, InputNumber } from 'antd'
import Draggable from 'react-draggable'
import AddNewNode from '../../components/common/AddNewNode/AddNewNode'
import { ExclamationCircleOutlined } from '@ant-design/icons'

const { confirm } = Modal

const Viewer = () => {
  const defaultTools = [
    {
      name: 'Wwwc',
      mode: 'active',
      modeOptions: { mouseButtonMask: 2 },
    },
    { name: 'StackScrollMouseWheel', mode: 'active' },
    {
      name: 'RectangleRoi',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'Eraser',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'Magnify',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'EllipticalRoi',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'Angle',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'Length',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'Pan',
      modeOptions: { mouseButtonMask: 1 },
    },
    {
      name: 'Zoom',
      modeOptions: { mouseButtonMask: 1 },
      configuration: {
        invert: false,
        preventZoomOutsideImage: false,
        minScale: 0.1,
        maxScale: 20.0,
      },
    },
  ]

  // ?????????
  // eslint-disable-next-line no-unused-vars
  const [toolsConfig, setToolsConfig] = useState(defaultTools)
  const [imagesConfig, setImagesConfig] = useState([])
  // eslint-disable-next-line no-unused-vars
  const [taskLength, setTaskLength] = useState(0)
  // eslint-disable-next-line no-unused-vars
  const [sequenceListData, setLeftSidePanelData] = useState([])
  const [noduleList, setNoduleList] = useState([])
  const [originNoduleList, setOriginNoduleList] = useState([])
  // eslint-disable-next-line no-unused-vars
  const [patients, setPatients] = useState([])
  const [noduleMapList, setNoduleMapList] = useState([])

  // ????????????
  const [noduleInfo, setNoduleInfo] = useState(null)

  // ?????????????????????
  const [pageType, setPageType] = useState('')
  const [pageState, setPageState] = useState('')

  // ????????????
  const [imageIdIndex, setImageIdIndex] = useState(0)

  // ????????????
  const [currentImageIdIndex, setCurrentImageIdIndex] = useState(0)

  // ?????? Dicom ??????
  const [currentDicomFileUrl, setCurrentDicomFileUrl] = useState('')

  // ????????????
  const [showMarker, setShowMarker] = useState(true)

  // ????????????
  const nodeRef = useRef()

  // ????????????
  const [historyList, setHistoryList] = useState([])

  useEffect(() => {
    nodeRef.current = {
      noduleList,
      noduleMapList,
      showMarker,
    }
  }, [noduleList, noduleMapList, showMarker])

  // ?????????????????????
  useEffect(() => {
    // ?????????????????????
    const fetchAdminData = async () => {
      const result = await getNodeList(getURLParameters(window.location.href).id)
      if (result.data.code === 200) {
        if (result.data.result) {
          const data = JSON.parse(result.data.result.text.replace(/'/g, '"'))
          formatNodeData(data, [])
          fetcImagehData(data.detectionResult.nodulesList)
        }
      }
    }

    // ????????????????????????
    const getDnReslutByOrderId = async () => {
      const result = await getDnReslutByOrderIdUrl(getURLParameters(window.location.href).orderId)
      if (result.data.code === 200) {
        if (result.data.result) {
          const data = JSON.parse(result.data.result.text.replace(/'/g, '"'))
          formatNodeData(data, [])
          fetcImagehData(data.detectionResult.nodulesList)
        }
      }
    }

    // ??????????????????
    const fetchDoctorData = async () => {
      const result = await getDoctorTask(getURLParameters(window.location.href).doctorId)
      if (result.data.code === 200) {
        if (result.data.result) {
          setHistoryList(result.data.result.historyReportList)
          if (result.data.result.doctorTask.resultInfo) {
            const data = JSON.parse(result.data.result.imageResult.replace(/'/g, '"'))
            const resultInfo = JSON.parse(result.data.result.doctorTask.resultInfo.replace(/'/g, '"'))
            formatNodeData(data, resultInfo.nodelist)
            fetcImagehData(data.detectionResult.nodulesList)
          } else {
            const data = JSON.parse(result.data.result.imageResult.replace(/'/g, '"'))
            formatNodeData(data, [])
            fetcImagehData(data.detectionResult.nodulesList)
          }
        }
      }
    }

    // ????????????????????????
    const fetchDoctorHistoryData = async () => {
      const result = await getDoctorHistoryTask(getURLParameters(window.location.href).taskId)
      if (result.data.code === 200) {
        if (result.data.result) {
          if (result.data.result.doctorTask.resultInfo) {
            const data = JSON.parse(result.data.result.imageResult.replace(/'/g, '"'))
            const resultInfo = JSON.parse(result.data.result.doctorTask.resultInfo.replace(/'/g, '"'))
            formatNodeData(data, resultInfo.nodelist)
            fetcImagehData(data.detectionResult.nodulesList)
          } else {
            const data = JSON.parse(result.data.result.imageResult.replace(/'/g, '"'))
            formatNodeData(data, [])
            fetcImagehData(data.detectionResult.nodulesList)
          }
        }
      }
    }

    const fetcImagehData = async data => {
      const res = await getImageList(getURLParameters(window.location.href).resource)
      setImageList(res, data)
    }

    if (getURLParameters(window.location.href).from === 'history') {
      setPageType('review')
      setPageState('admin')
      fetchDoctorHistoryData()
    } else {
      if (getURLParameters(window.location.href).user === 'admin') {
        if (getURLParameters(window.location.href).requestType === 'order') {
          getDnReslutByOrderId()
        } else {
          fetchAdminData()
        }
      } else if (!getURLParameters(window.location.href).user) {
        fetcImagehData(null)
      } else {
        fetchDoctorData()
      }

      if (getURLParameters(window.location.href).state === 'admin') {
        setPageState('admin')
      }

      if (getURLParameters(window.location.href).page === 'review') {
        setPageType('review')
      } else if (getURLParameters(window.location.href).page === 'image') {
        setPageType('image')
      } else if (getURLParameters(window.location.href).page === 'detail') {
        setPageType('detail')
        const index = getURLParameters(window.location.href).index
        if (index) {
          setImageIdIndex(Number(index))
        } else {
          setImageIdIndex(0)
        }
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ?????????????????????
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const result = await getPatientsList(getURLParameters(window.location.href).resource)
  //     if (result.data.code === 200 && result.data.result) {
  //       setPatients(result.data.result.records[0])
  //       localStorage.setItem('patients', JSON.stringify(result.data.result.records[0]))
  //     } else {
  //       localStorage.setItem('patients', '')
  //     }
  //   }
  //   // if (getURLParameters(window.location.href).page === 'image') {
  //   fetchData()
  //   // }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [])

  // ??????
  const [indeterminate, setIndeterminate] = useState(false)
  const [checkAll, setCheckAll] = useState(true)

  // ????????????
  const [cornerstoneElement, setCornerstoneElement] = useState(null)

  // ?????????
  const [showPopover, setShowPopover] = useState({
    index: 0,
    visible: false,
  })

  // ??????????????????
  const handleShowMarker = e => {
    const flag = !showMarker
    setShowMarker(flag)

    if (flag) {
      setTimeout(() => {
        addNodeTool(cornerstoneElement, currentImageIdIndex)
      }, 200)
    } else {
      cornerstoneTools.clearToolState(cornerstoneElement, 'MarkNodule')
      cornerstone.updateImage(cornerstoneElement)
    }
  }

  // ===========================================================

  // ??????????????????
  const addNodeTool = (cornerstoneElement, index = 0) => {
    const item = nodeRef.current.noduleMapList.filter(item => item.index === index)
    const checkItme = nodeRef.current.noduleList.find(item => item.checked === true)

    if (nodeRef.current.showMarker === false) {
      cornerstoneTools.clearToolState(cornerstoneElement, 'MarkNodule')
      cornerstone.updateImage(cornerstoneElement)
    }

    if (item.length >= 1 && nodeRef.current.showMarker) {
      cornerstoneTools.clearToolState(cornerstoneElement, 'MarkNodule')
      if (checkItme) {
        const checkNode = item.filter(item => item.noduleName === checkItme.noduleName)
        for (let i = 0; i < item.length; i++) {
          const measurementData = {
            visible: true,
            active: true,
            color: item[i].noduleName === (checkNode[0] && checkNode[0].noduleName) ? undefined : 'white',
            invalidated: true,
            handles: {
              start: {
                x: item[i].nodeType === 1 ? item[i].startX : item[i].startX - 3,
                y: item[i].nodeType === 1 ? item[i].startY : item[i].startY - 3,
                highlight: true,
                active: true,
              },
              end: {
                x: item[i].nodeType === 1 ? item[i].endX : item[i].endX + 3,
                y: item[i].nodeType === 1 ? item[i].endY : item[i].endY + 3,
                highlight: true,
                active: true,
              },
            },
          }
          cornerstoneTools.addToolState(cornerstoneElement, 'MarkNodule', measurementData)
        }
      } else {
        for (let i = 0; i < item.length; i++) {
          const measurementData = {
            visible: true,
            active: true,
            color: 'white',
            invalidated: true,
            handles: {
              start: {
                x: item[i].nodeType === 1 ? item[i].startX : item[i].startX - 3,
                y: item[i].nodeType === 1 ? item[i].startY : item[i].startY - 3,
                highlight: true,
                active: true,
              },
              end: {
                x: item[i].nodeType === 1 ? item[i].endX : item[i].endX + 3,
                y: item[i].nodeType === 1 ? item[i].endY : item[i].endY + 3,
                highlight: true,
                active: true,
              },
            },
          }
          cornerstoneTools.addToolState(cornerstoneElement, 'MarkNodule', measurementData)
        }
      }
      cornerstone.updateImage(cornerstoneElement)
    } else {
      cornerstoneTools.clearToolState(cornerstoneElement, 'MarkNodule')
      cornerstone.updateImage(cornerstoneElement)
    }
  }

  // ??????????????????
  const setImageList = (res, data) => {
    if (res.data.code === 200 && res.data.result.length > 0) {
      const newList = res.data.result
      const imageList = []
      newList.forEach(item => {
        imageList.push(`wadouri:${item.ossUrl.replace('http://', 'https://')}`)
      })

      setImagesConfig(imageList)

      // loadAndCacheImage(cornerstone, imageList, data)

      // ????????????
      if (data && data.length > 0) {
        loadAndCacheImage(cornerstone, imageList, data)
      }
    }
  }

  // ===========================================================

  // ??????
  const onCheckChange = (index, num) => {
    handleCheckedListClick(num)
    noduleList.map(item => (item.checked = false))
    noduleList[index].checked = true
    setNoduleList([...noduleList])
    if (noduleList.every(item => item.checked === true)) {
      setIndeterminate(false)
      setCheckAll(true)
    } else {
      setIndeterminate(true)
      setCheckAll(false)
    }

    const checkItme = noduleList.find(item => item.checked === true)
    if (checkItme && pageType !== 'detail') {
      setNoduleInfo(checkItme)
    } else {
      setNoduleInfo(null)
    }
  }

  // ??????
  const onCheckAllChange = e => {
    setCheckAll(e.target.checked)
    if (e.target.checked) {
      noduleList.map(item => (item.checked = true))
      setNoduleList([...noduleList])
    } else {
      noduleList.map(item => (item.checked = false))
      setNoduleList([...noduleList])
    }
  }

  // ?????????????????????
  const handleHideNodule = (e, id) => {
    // noduleList.splice(
    //   noduleList.findIndex(item => item.id === id),
    //   1
    // )
    // setNoduleList([...noduleList])
    // setShowPopover({
    //   visible: false,
    //   index: 0,
    // })
  }

  // ??????????????????
  const handleCheckedListClick = index => {
    // const item = noduleList.find(item => Number(item.num) === index + 1)
    // if (item) {
    //   noduleList.map(item => (item.active = false))
    //   item.active = true
    //   setNoduleList([...noduleList])
    //   setTimeout(() => {
    //     const viewerItemActive = document.querySelector('#viewerItemBox .item-active')
    //     viewerItemActive && viewerItemActive.scrollIntoView()
    //   }, 0)
    // }

    // noduleList.map(item => (item.checked = false))
    // noduleList[index].checked = true
    // setNoduleList([...noduleList])

    // ??????????????????
    setCurrentImageIdIndex(index)

    // ???????????????????????????
    if (cornerstoneElement) {
      changeActiveImage(index, cornerstoneElement)
    }
  }

  // ??????????????????
  const updateNoduleList = checkState => {
    const checkItme = noduleList.find(item => item.checked === true)
    checkItme.review = true
    checkItme.state = checkState
    setNoduleList([...noduleList])

    // ??????????????????
    saveResults()
  }

  // ???????????????
  const updateChiefNoduleList = checkState => {
    const checkItme = noduleList.find(item => item.checked === true)
    checkItme.chiefReview = checkState
    setNoduleList([...noduleList])

    // ??????????????????
    saveResults()
  }

  // ???????????????????????????
  const updateChiefMarkNode = checkState => {
    const checkItme = noduleList.find(item => item.checked === true)
    checkItme.markNode = checkState
    setNoduleList([...noduleList])

    // ??????????????????
    saveResults()
  }

  // ??????????????????
  const checkNoduleList = (val, type) => {
    const checkItme = noduleList.find(item => item.checked === true)
    if (checkItme && type === 'lung') {
      checkItme.lung = val
      checkItme.review = true
    }
    if (checkItme && type === 'lobe') {
      checkItme.lobe = val
      checkItme.review = true
    }
    if (checkItme && type === 'type') {
      checkItme.type = val
      checkItme.review = true
    }
    if (checkItme && type === 'soak') {
      checkItme.newSoak = val
      checkItme.review = true
    }
    setNoduleList([...noduleList])

    // ??????????????????
    saveResults()
  }

  // ??????????????????????????????
  const handleTextareaOnChange = e => {
    const checkItme = noduleList.find(item => item.checked === true)
    if (checkItme) {
      checkItme.suggest = e.target.value
      checkItme.review = true
      setNoduleList([...noduleList])
    }
  }

  // ????????????????????????????????????
  const handleInputBlur = e => {
    const checkItme = noduleList.find(item => item.checked === true)
    if (checkItme) {
      checkItme.suggest = e.target.value
      checkItme.review = true
      setNoduleList([...noduleList])
    }
    // ??????????????????
    saveResults()
  }

  // ??????????????????
  const handleUpdateRisk = (val, type) => {
    const checkItme = noduleList.find(item => item.checked === true)
    if (checkItme) {
      checkItme.scrynMaligant = val
      checkItme.review = true
      setNoduleList([...noduleList])
    }
    // ??????????????????
    if (type !== 'inputChange') {
      saveResults()
    }
  }

  // ????????????????????????
  const handleVisibleChange = (visible, index) => {
    if (visible) {
      setShowPopover({
        visible: visible,
        index: index,
      })
    } else {
      setShowPopover({
        visible: visible,
        index: 0,
      })
    }
  }

  // ===========================================================

  // ??????????????????????????????
  const changeToolActive = (checked, type) => {
    if (checked) {
      cornerstoneTools.setToolActive(type, { mouseButtonMask: 1 })
    } else {
      cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 })
    }
  }

  // ??????????????????????????????
  const setActiveToolState = () => {
    const activeTool = document.querySelector('.tool-bar-box .active')
    if (activeTool) {
      cornerstoneTools.setToolActive(activeTool.dataset.type, { mouseButtonMask: 1 })
    } else {
      cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 })
    }
  }

  const handleToolbarClick = (type, checked) => {
    let viewport = cornerstone.getViewport(cornerstoneElement)
    switch (type) {
      case 'Magnify':
      case 'RectangleRoi':
      case 'Eraser':
      case 'EllipticalRoi':
      case 'Angle':
      case 'Length':
      case 'MarkNodule':
      case 'MeasureRect':
      case 'Zoom':
      case 'Pan':
        changeToolActive(checked, type)
        break
      case 'hflip':
        viewport.hflip = !viewport.hflip
        cornerstone.setViewport(cornerstoneElement, viewport)
        break
      case 'vflip':
        viewport.vflip = !viewport.vflip
        cornerstone.setViewport(cornerstoneElement, viewport)
        break
      case 'playClip':
        if (checked) {
          cornerstoneTools.playClip(cornerstoneElement, 10)
        } else {
          cornerstoneTools.stopClip(cornerstoneElement)
        }
        break
      case 'Reset':
        cornerstone.reset(cornerstoneElement)
        windowChange(cornerstoneElement, cornerstone.getImage(cornerstoneElement), 2)
        break
      default:
        break
    }
  }

  // ??????????????????
  const changeActiveImage = (index, cornerstoneElement) => {
    cornerstone.loadImage(imagesConfig[index]).then(image => {
      cornerstone.displayImage(cornerstoneElement, image)
      cornerstoneTools.addStackStateManager(cornerstoneElement, ['stack'])
      cornerstoneTools.addToolState(cornerstoneElement, 'stack', {
        currentImageIdIndex: Number(index),
        imageIds: imagesConfig,
      })
    })
  }

  // ????????????
  const [showMark, setShowMark] = useState(false)
  const showMarkDialog = (e, cornerstoneElement) => {
    const tool = cornerstoneTools.getToolState(cornerstoneElement, 'MarkNodule')
    let mark = document.getElementById('mark')
    if (tool && mark && mark.classList.contains('active')) {
      setShowMark(true)
    }
  }

  // ??????????????????
  const handleCloseCallback = () => {
    const tool = cornerstoneTools.getToolState(cornerstoneElement, 'MarkNodule')
    const toolData = tool.data.pop()
    cornerstoneTools.removeToolState(cornerstoneElement, 'MarkNodule', toolData)
    cornerstone.updateImage(cornerstoneElement)
    setShowMark(false)
  }

  const handleSubmitCallback = value => {
    const tool = cornerstoneTools.getToolState(cornerstoneElement, 'MarkNodule')

    if (tool) {
      const toolData = tool.data.pop()
      const measurementData = {
        visible: true,
        active: false,
        color: undefined,
        invalidated: true,
        handles: {
          start: {
            x: toolData.handles.start.x,
            y: toolData.handles.start.y,
            highlight: true,
            active: false,
          },
          end: {
            x: toolData.handles.end.x,
            y: toolData.handles.end.y,
            highlight: true,
            active: true,
          },
        },
      }
      cornerstoneTools.clearToolState(cornerstoneElement, 'MarkNodule')
      cornerstoneTools.addToolState(cornerstoneElement, 'MarkNodule', measurementData)
      cornerstone.updateImage(cornerstoneElement)
      setShowMark(false)
    }
  }

  // ????????????????????????
  const handleElementEnabledEvt = elementEnabledEvt => {
    const cornerstoneElement = elementEnabledEvt.detail.element
    setCornerstoneElement(cornerstoneElement)
    cornerstoneTools.addTool(MarkNoduleTool)
    cornerstoneTools.addTool(MeasureRectTool)

    let flag = true

    cornerstoneElement.addEventListener('cornerstonenewimage', newImage => {
      const curImageId = newImage.detail.image.imageId
      const index = imagesConfig.findIndex(item => item === curImageId)

      if (flag) {
        windowChange(cornerstoneElement, newImage.detail.image, 2)
        flag = false
      }

      cornerstoneTools.setToolActive('MarkNodule', { mouseButtonMask: 1 })
      setTimeout(() => {
        addNodeTool(cornerstoneElement, index)
        setActiveToolState()
      }, 0)
    })

    // cornerstoneElement.addEventListener('cornerstoneimageloaded', newImage => {
    //   console.log(1)
    // })

    cornerstoneElement.addEventListener('cornerstoneimagerendered', imageRenderedEvent => {
      const curImageId = imageRenderedEvent.detail.image.imageId
      const index = imagesConfig.findIndex(item => item === curImageId)
      setCurrentDicomFileUrl(curImageId)
      handleCheckedListClick(index)
    })

    cornerstoneElement.addEventListener('cornerstonetoolsmouseup', e => {
      if (localStorage.getItem('active') === 'true') {
        showMarkDialog(e, cornerstoneElement)
      }
    })
  }

  // ??????????????????
  const windowChange = (element, image, index) => {
    /*
     * index = 1???ww: default, wl: default
     * index = 2???ww: 1500, wl: -450
     * index = 3???ww: 250, wl: 30
     * index = 4???ww: 1000, wl: 250
     * index = 5???ww: 300, wl: 40
     */
    const viewportDefault = cornerstone.getDefaultViewportForImage(element, image)
    const viewport = cornerstone.getViewport(element)
    viewport.voiLUT = undefined

    if (index === 1) {
      viewport.voi.windowWidth = viewportDefault.voi.windowWidth
      viewport.voi.windowCenter = viewportDefault.voi.windowCenter
    } else if (index === 2) {
      viewport.voi.windowWidth = 1500
      viewport.voi.windowCenter = -400
    } else if (index === 3) {
      viewport.voi.windowWidth = 250
      viewport.voi.windowCenter = 30
    } else if (index === 4) {
      viewport.voi.windowWidth = 1000
      viewport.voi.windowCenter = 250
    } else if (index === 5) {
      viewport.voi.windowWidth = 300
      viewport.voi.windowCenter = 40
    }

    cornerstone.setViewport(element, viewport)
  }

  // ===========================================================

  // ???????????????
  // const saveAs = (element, filename, mimetype = 'image/png') => {
  //   const canvas = element.querySelector('canvas')
  //   if (canvas.msToBlob) {
  //     const blob = canvas.msToBlob()

  //     return window.navigator.msSaveBlob(blob, filename)
  //   }

  //   const lnk = document.createElement('a')
  //   lnk.download = filename
  //   lnk.href = canvas.toDataURL(mimetype, 1)

  //   if (document.createEvent) {
  //     const e = document.createEvent('MouseEvents')
  //     e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
  //     lnk.dispatchEvent(e)
  //   } else if (lnk.fireEvent) {
  //     lnk.fireEvent('onclick')
  //   }
  // }

  // ?????????????????????
  const formatDiameter = diameter => {
    if (diameter) {
      return Math.max(...diameter.replace('*', '').split('mm'))
    } else {
      return ''
    }
  }

  // ????????????????????????
  // const [preVal, setPreVal] = useState(localStorage.getItem('diameterSize'))

  // ???????????????????????????????????????
  const handleSliderChange = (val, type) => {
    // for (let i = 0; i < noduleList.length; i++) {
    //   if (noduleList[i].diameterSize <= val) {
    //     noduleList[i].review = true
    //     noduleList[i].chiefReview = true
    //     noduleList[i].state = true
    //   }

    //   if (noduleList[i].diameterSize >= val && noduleList[i].diameterSize < preVal) {
    //     noduleList[i].review = false
    //     noduleList[i].chiefReview = false
    //     noduleList[i].state = undefined
    //   }
    // }
    setNoduleList([...noduleList])
    // if (preVal !== val) {
    //   setPreVal(val)
    // }
    if (type !== 'init') {
      saveResults()
    }
  }

  // ?????????????????????
  const formatNodeData = (data, resultInfo) => {
    const nodulesList = []
    const nodulesMapList = []
    let index = 0
    if (data.code === 10000) {
      setOriginNoduleList([...data.detectionResult.nodulesList])
      const res = data.detectionResult.nodulesList

      // ?????????????????????
      if (resultInfo[0] && resultInfo[0].diameterMaxSize) {
        localStorage.setItem('diameterSize', resultInfo[0].diameterMaxSize)
      } else {
        localStorage.setItem('diameterSize', 3)
      }

      // const res = data.detectionResult.nodulesList.sort(nestedSort('coord', 'coordZ'))
      for (let i = 0; i < res.length; i++) {
        nodulesList.push({
          id: index,
          num: res[i].coord.coordZ,
          type: resultInfo[i] ? resultInfo[i].featureLabel : res[i].featureLabel.value,
          risk: (res[i].scrynMaligant * 100).toFixed(0),
          scrynMaligant:
            resultInfo[i] && resultInfo[i].scrynMaligant
              ? resultInfo[i].scrynMaligant
              : (res[i].scrynMaligant * 100).toFixed(0),
          soak: res[i].invisionClassify ? res[i].invisionClassify : '',
          newSoak:
            resultInfo[i] && resultInfo[i].newSoak
              ? resultInfo[i].newSoak
              : res[i].invisionClassify
              ? res[i].invisionClassify
              : '',
          info: '',
          checked: false,
          active: false,
          noduleName: res[i].noduleName,
          noduleNum: res[i].noduleNum,
          state:
            resultInfo[i] && Number(resultInfo[i].invisable) === 1
              ? false
              : resultInfo[i] && Number(resultInfo[i].invisable) === 0
              ? true
              : undefined,
          markNode:
            resultInfo[i] && resultInfo[i].markNode === true
              ? true
              : resultInfo[i] && resultInfo[i].markNode === false
              ? false
              : undefined,
          review: resultInfo[i] ? resultInfo[i].edit : false,
          chiefReview: resultInfo[i] && resultInfo[i].chiefReview ? resultInfo[i].chiefReview : false,
          lung: resultInfo[i] ? resultInfo[i].lungLocation : res[i].lobe.lungLocation,
          lobe: resultInfo[i] ? resultInfo[i].lobeLocation : res[i].lobe.lobeLocation,
          diameter: res[i].diameter,
          diameterSize:
            resultInfo[i] && resultInfo[i].newDiameter
              ? formatDiameter(resultInfo[i].newDiameter)
              : formatDiameter(res[i].diameter),
          noduleSize: res[i].noduleSize,
          newDiameter: resultInfo[i] && resultInfo[i].newDiameter ? resultInfo[i].newDiameter : '',
          newNoduleSize: resultInfo[i] && resultInfo[i].newNoduleSize ? resultInfo[i].newNoduleSize : '',
          featureLabelG: res[i].featureLabelG,
          suggest: resultInfo[i] ? resultInfo[i].suggest : '',
        })
        index++
      }

      for (let i = 0; i < res.length; i++) {
        for (let j = 0; j < res[i].rois.length; j++) {
          const rois = res[i].rois[j]
          nodulesMapList.push({
            noduleName: res[i].noduleName,
            index: Number(rois.key),
            startX: rois.bbox[1],
            startY: rois.bbox[0],
            endX: rois.bbox[3],
            endY: rois.bbox[2],
          })
        }
      }

      for (let i = 0; i < resultInfo.length; i++) {
        if (resultInfo[i].nodeType && resultInfo[i].nodeType === 1) {
          nodulesList.push({
            id: index,
            num: resultInfo[i].imageIndex,
            size: '',
            type: resultInfo[i].featureLabel,
            risk: resultInfo[i].risk,
            scrynMaligant: resultInfo[i].scrynMaligant,
            soak: '',
            info: '',
            checked: false,
            active: false,
            noduleName: resultInfo[i].noduleName,
            noduleNum: resultInfo[i].noduleNum,
            state: Number(resultInfo[i].invisable) === 1 ? false : Number(resultInfo[i].invisable) === 0 ? true : true,
            markNode: resultInfo[i].markNode === true ? true : resultInfo[i].markNode === false ? false : true,
            review: true,
            chiefReview: resultInfo[i].chiefReview ? resultInfo[i].chiefReview : false,
            lung: resultInfo[i].lungLocation,
            lobe: resultInfo[i].lobeLocation,
            featureLabelG: resultInfo[i].featureLabel,
            suggest: resultInfo[i].suggest,
            nodeType: resultInfo[i].nodeType,
            imageUrl1: resultInfo[i].imageUrl1,
            imageUrl2: resultInfo[i].imageUrl2,
            whu_scrynMaligant: resultInfo[i].whu_scrynMaligant,
            nodeBox: resultInfo[i].nodeBox,
            maxHu: resultInfo[i].maxHu,
            minHu: resultInfo[i].minHu,
            meanHu: resultInfo[i].meanHu,
            diameterNorm: resultInfo[i].diameterNorm,
            centerHu: resultInfo[i].centerHu,
            diameter: resultInfo[i].diameter,
            diameterSize: resultInfo[i].newDiameter
              ? formatDiameter(resultInfo[i].newDiameter)
              : formatDiameter(resultInfo[i].diameter),
            noduleSize: resultInfo[i].noduleSize,
            newDiameter: resultInfo[i].newDiameter,
            newNoduleSize: resultInfo[i].newNoduleSize,
          })

          index++

          nodulesMapList.push({
            noduleName: resultInfo[i].noduleName,
            nodeType: 1,
            index: resultInfo[i].imageIndex,
            startX: resultInfo[i].nodeBox[1],
            startY: resultInfo[i].nodeBox[0],
            endX: resultInfo[i].nodeBox[3],
            endY: resultInfo[i].nodeBox[2],
          })
        }
      }

      setNoduleList([...nodulesList])
      setNoduleMapList([...nodulesMapList])
    } else {
      setNoduleList([])
      console.log(`??????????????????`)
    }
  }

  // ?????????????????????
  const loadAndCacheImage = (cornerstone, imageList, data) => {
    try {
      const coordZList = []
      for (let i = 0; i < data.length; i++) {
        coordZList.push(data[i].coord.coordZ)
      }

      let filterArr = []
      for (let i = 0; i < coordZList.length; i++) {
        var pre = coordZList[i] - 5 > 0 ? coordZList[i] - 5 : 0
        for (let j = 0; j < 10; j++) {
          filterArr.push(pre + j)
        }
      }

      filterArr = [...new Set(filterArr)]
      const newImageList = []
      for (let i = 0; i < filterArr.length; i++) {
        newImageList.push(imageList[filterArr[i]])
      }

      for (let i = 0; i < newImageList.length; i++) {
        cornerstone.loadAndCacheImage(newImageList[i])
      }
    } catch (error) {
      console.log(error)
    }
    // for (let i = 0; i < imageList.length; i++) {
    //   cornerstone.loadAndCacheImage(imageList[i])
    // }
  }

  // ===========================================================

  const [showState, setShowState] = useState(false)

  // ???????????????????????????
  const showNoduleList = () => {
    console.log(showState)
    setShowState(!showState)
  }

  // ===========================================================

  const [visible, setVisible] = useState(false)

  const hideModal = () => {
    setVisible(false)
  }

  // ??????????????????
  const getCurrentTime = () => {
    let yy = new Date().getFullYear()
    let mm = new Date().getMonth() + 1
    let dd = new Date().getDate()
    let hh = new Date().getHours()
    let mf = new Date().getMinutes() < 10 ? '0' + new Date().getMinutes() : new Date().getMinutes()
    let ss = new Date().getSeconds() < 10 ? '0' + new Date().getSeconds() : new Date().getSeconds()
    return yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mf + ':' + ss
  }

  // ?????????????????????
  const formatPostData = () => {
    // ??????????????????
    const noduleMeasure = Number(localStorage.getItem('diameterSize'))

    // ??????????????????
    const miniNodule = formatMiniNodule([...noduleList])

    const postData = {
      id:
        getURLParameters(window.location.href).user === 'admin'
          ? getURLParameters(window.location.href).taskId
          : getURLParameters(window.location.href).doctorId,
      resultInfo: {
        noduleMeasure: noduleMeasure,
        miniNodule: miniNodule,
        nodelist: [],
      },
    }

    for (let i = 0; i < noduleList.length; i++) {
      const index = originNoduleList.findIndex(item => item.noduleNum === noduleList[i].noduleNum) + 1
      const diameterSize = noduleList[i].newDiameter
        ? formatDiameter(noduleList[i].newDiameter)
        : noduleList[i].diameter
        ? formatDiameter(noduleList[i].diameter)
        : ''
      postData.resultInfo.nodelist.push({
        index: index ? index : noduleList.length + 1,
        imageIndex: noduleList[i].num,
        lungLocation: noduleList[i].lung,
        lobeLocation: noduleList[i].lobe,
        featureLabel: noduleList[i].type,
        edit_time: getCurrentTime(),
        edit: noduleList[i].review,
        chiefReview: noduleList[i].chiefReview,
        markNode: noduleList[i].markNode,
        suggest: noduleList[i].suggest,
        invisable: noduleList[i].state === false ? '1' : noduleList[i].state === true ? '0' : '-',
        nodeType: noduleList[i].nodeType ? noduleList[i].nodeType : '',
        noduleName: noduleList[i].noduleName ? noduleList[i].noduleName : '',
        noduleNum: noduleList[i].noduleNum ? noduleList[i].noduleNum : '',
        imageUrl1: noduleList[i].imageUrl1 ? noduleList[i].imageUrl1 : '',
        imageUrl2: noduleList[i].imageUrl2 ? noduleList[i].imageUrl2 : '',
        whu_scrynMaligant: noduleList[i].whu_scrynMaligant ? noduleList[i].whu_scrynMaligant : '',
        nodeBox: noduleList[i].nodeBox ? noduleList[i].nodeBox : '',
        diameter: noduleList[i].diameter ? noduleList[i].diameter : '',
        diameterSize: diameterSize,
        diameterMaxSize: localStorage.getItem('diameterSize'),
        maxHu: noduleList[i].maxHu ? noduleList[i].maxHu : '',
        minHu: noduleList[i].minHu ? noduleList[i].minHu : '',
        meanHu: noduleList[i].meanHu ? noduleList[i].meanHu : '',
        diameterNorm: noduleList[i].diameterNorm ? noduleList[i].diameterNorm : '',
        noduleSize: noduleList[i].noduleSize ? noduleList[i].noduleSize : '',
        centerHu: noduleList[i].centerHu ? noduleList[i].centerHu : '',
        risk: noduleList[i].risk ? noduleList[i].risk : '',
        scrynMaligant: noduleList[i].scrynMaligant ? noduleList[i].scrynMaligant : '',
        newDiameter: noduleList[i].newDiameter ? noduleList[i].newDiameter : '',
        newNoduleSize: noduleList[i].newNoduleSize ? noduleList[i].newNoduleSize : '',
        soak: noduleList[i].soak ? noduleList[i].soak : '',
        newSoak: noduleList[i].newSoak ? noduleList[i].newSoak : '',
        miniType: diameterSize <= noduleMeasure ? 1 : 0,
      })
    }

    console.log(postData.resultInfo)

    postData.resultInfo = JSON.stringify(postData.resultInfo)

    return postData
  }

  // ??????????????????
  const saveResults = callback => {
    const postData = formatPostData()
    saveDnResult(JSON.stringify(postData)).then(res => {
      if (res.data.code === 200) {
        message.success(`????????????????????????`)
        callback && callback()
      } else {
        message.error(`???????????????????????????????????????????????????????????????????????????`)
      }
    })
  }

  // ????????????????????????
  const handleShowModal = () => {
    formatPostData()
    if (getURLParameters(window.location.href).user === 'chief_lwx') {
      if (!noduleList.every(item => item.chiefReview === true)) {
        message.warning(`????????????????????????????????????????????????`)
        return false
      }

      // if (!noduleList.every(item => item.markNode === true)) {
      //   message.warning(`??????????????????????????????????????????????????????`)
      //   return false
      // }
      setVisible(true)
    } else {
      if (noduleList.every(item => item.review === true)) {
        setVisible(true)
      } else {
        message.warning(`????????????????????????????????????????????????`)
      }
    }
  }

  // ????????????????????????
  const handleSubmitResults = () => {
    const postData = formatPostData()

    if (getURLParameters(window.location.href).user === 'chief_lwx') {
      updateSuperDoctorResult(JSON.stringify(postData)).then(res => {
        console.log(res)
        if (res.data.code === 200) {
          message.success(`????????????????????????`)
          setVisible(false)
          setTimeout(() => {
            window.parent.postMessage(
              {
                code: 200,
                success: true,
                backId: getURLParameters(window.location.href).backId,
                backType: getURLParameters(window.location.href).backType,
              },
              '*'
            )
          }, 1000)
        } else {
          message.error(`???????????????????????????????????????`)
        }
      })
    } else {
      updateDnResult(JSON.stringify(postData)).then(res => {
        console.log(res)
        if (res.data.code === 200) {
          message.success(`????????????????????????`)
          setVisible(false)
          setTimeout(() => {
            window.parent.postMessage(
              {
                code: 200,
                success: true,
                backId: getURLParameters(window.location.href).backId,
                backType: getURLParameters(window.location.href).backType,
              },
              '*'
            )
          }, 1000)
        } else {
          message.error(`???????????????????????????????????????`)
        }
      })
    }
  }

  // ===========================================================

  const draggleRef = React.createRef()
  const [modalVisible, setModalVisible] = useState(false)
  const [modalDisabled, setModalDisabled] = useState(true)
  const [modalBounds, setModalBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
  const [toolList, setToolList] = useState([])
  const [adjustModalVisible, setAdjustModalVisible] = useState(false)

  const [confirmLoading, setConfirmLoading] = useState(false)

  // ??????????????????
  const handleSubmitNodeDetail = e => {
    const tool = cornerstoneTools.getToolState(cornerstoneElement, 'RectangleRoi')
    if (!tool || tool.data.length === 0) {
      message.warn(`???????????????????????????????????????`)
      return false
    }

    if (tool.data.length > 1) {
      message.warn(`??????????????????????????????????????????????????????????????????`)
      return false
    }

    formatNewNodeData(tool.data)
    setTimeout(() => {
      showModal()
    }, 0)
  }

  // ???????????????????????????
  const fetchDoctorData = async callback => {
    const result = await getDoctorTask(getURLParameters(window.location.href).doctorId)
    if (result.data.code === 200) {
      if (result.data.result) {
        if (result.data.result.doctorTask.resultInfo) {
          const data = JSON.parse(result.data.result.imageResult.replace(/'/g, '"'))
          const resultInfo = JSON.parse(result.data.result.doctorTask.resultInfo.replace(/'/g, '"'))
          formatNodeData(data, resultInfo.nodelist)
          callback && callback()
        } else {
          const data = JSON.parse(result.data.result.imageResult.replace(/'/g, '"'))
          formatNodeData(data, [])
          callback && callback()
        }
      }
    } else {
      message.error(`???????????????????????????????????????????????????`)
    }
  }

  // ???????????????????????????
  const formatNewNodeData = data => {
    const toolList = []
    for (let i = 0; i < data.length; i++) {
      toolList.push({
        uuid: data[i].uuid,
        lung: '',
        lobe: '',
        type: undefined,
        suggest: '',
        cachedStats: data[i].cachedStats,
        startX: data[i].handles.start.x,
        startY: data[i].handles.start.y,
        endX: data[i].handles.end.x,
        endY: data[i].handles.end.y,
      })
    }
    setToolList(toolList)
  }

  // ??????????????????
  const updateToolList = (val, type, id) => {
    const checkItme = toolList.find(item => item.uuid === id)
    if (checkItme && type === 'lung') {
      checkItme.lung = val
    }
    if (checkItme && type === 'lobe') {
      checkItme.lobe = val
    }
    if (checkItme && type === 'type') {
      checkItme.type = val
    }
    setToolList([...toolList])
  }

  // ??????????????????????????????
  const handleToolListTextareaChange = (e, id) => {
    const checkItme = toolList.find(item => item.uuid === id)
    if (checkItme) {
      checkItme.suggest = e.target.value
      setToolList([...toolList])
    }
  }

  // ????????????????????????????????????
  const handleToolListTextareaBlur = (e, id) => {
    const checkItme = toolList.find(item => item.uuid === id)
    if (checkItme) {
      checkItme.suggest = e.target.value
      setToolList([...toolList])
    }
  }

  const showModal = () => {
    setModalVisible(true)
  }

  const handleCancel = e => {
    setModalVisible(false)
  }

  // ????????????
  const [showRisk, setShowRisk] = useState(false)
  const [riskVal, setRiskVal] = useState(0)
  const [postData, setPostData] = useState(null)
  const [res, setRes] = useState(null)

  const handleRiskOk = () => {
    setConfirmLoading(false)

    const startX = postData.boxes.split(',')[1]
    const startY = postData.boxes.split(',')[0]
    const endX = postData.boxes.split(',')[3]
    const endY = postData.boxes.split(',')[2]
    const rowPixelSpacing = cornerstone.getImage(cornerstoneElement).rowPixelSpacing

    const newNodeData = {
      active: false,
      checked: false,
      featureLabelG: '',
      id: `id_${toolList[0].uuid}`,
      info: '',
      lobe: toolList[0].lobe,
      lung: toolList[0].lung,
      noduleName: `nodule_${toolList[0].uuid}`,
      noduleNum: toolList[0].uuid,
      num: currentImageIdIndex,
      review: getURLParameters(window.location.href).user === 'chief_lwx' ? false : true,
      chiefReview: getURLParameters(window.location.href).user === 'chief_lwx' ? true : false,
      size: '',
      soak: '',
      markNode: true,
      state: true,
      suggest: toolList[0].suggest,
      type: toolList[0].type,
      nodeType: 1,
      imageUrl1: res.data.imageUrl1,
      imageUrl2: res.data.imageUrl2,
      risk: res.data.scrynMaligant,
      scrynMaligant: riskVal ? riskVal : res.data.scrynMaligant,
      whu_scrynMaligant: riskVal ? riskVal : res.data.whu_scrynMaligant,
      nodeBox: [startY, startX, endY, endX],
      diameter: `${(Math.abs(endX - startX) * rowPixelSpacing).toFixed(2)}mm*${(
        Math.abs(endY - startY) * rowPixelSpacing
      ).toFixed(2)}mm`,
      diameterSize: formatDiameter(
        `${(Math.abs(endX - startX) * rowPixelSpacing).toFixed(2)}mm*${(
          Math.abs(endY - startY) * rowPixelSpacing
        ).toFixed(2)}mm`
      ),
      maxHu: toolList[0].cachedStats.max,
      minHu: toolList[0].cachedStats.min,
      meanHu: toolList[0].cachedStats.mean.toFixed(2),
      diameterNorm: Math.sqrt(toolList[0].cachedStats.area).toFixed(2),
      noduleSize: (Math.pow(Math.sqrt(toolList[0].cachedStats.area) / 2, 3) * Math.PI).toFixed(2),
      centerHu: cornerstone.getPixels(
        cornerstoneElement,
        (Number(startX) + Number(endX)) / 2,
        (Number(startY) + Number(endY)) / 2,
        1,
        1
      )[0],
    }

    noduleList.push(newNodeData)
    setNoduleList([...noduleList])

    saveResults(callback => {
      fetchDoctorData(callback => {
        updateCanvasAndList()
      })
    })

    setShowRisk(false)
  }

  const handleOk = e => {
    for (let i = 0; i < toolList.length; i++) {
      if (!toolList[i].lung) {
        message.warn(`?????????????????????????????????????????????`)
        return false
      }

      if (!toolList[i].lobe) {
        message.warn(`????????????????????????????????????????????????`)
        return false
      }

      if (!toolList[i].type) {
        message.warn(`????????????????????????????????????????????????`)
        return false
      }

      if (toolList[i].lung === '??????' && toolList[i].lobe === '??????') {
        message.warn(`????????????????????????????????????????????????`)
        return false
      }
    }

    const postData = {
      dicom_url: currentDicomFileUrl.replace('wadouri:', '').replace('https://', 'http://'),
      boxes: [],
    }

    if (toolList[0].startX > toolList[0].endX) {
      postData.boxes = [
        parseInt(toolList[0].endY),
        parseInt(toolList[0].endX),
        parseInt(toolList[0].startY),
        parseInt(toolList[0].startX),
      ].join(',')
    } else {
      postData.boxes = [
        parseInt(toolList[0].startY),
        parseInt(toolList[0].startX),
        parseInt(toolList[0].endY),
        parseInt(toolList[0].endX),
      ].join(',')
    }

    setPostData(postData)

    // startX: rois.bbox[1],
    // startY: rois.bbox[0],
    // endX: rois.bbox[3],
    // endY: rois.bbox[2],

    const hide = message.loading('???????????????????????????..', 0)
    setConfirmLoading(true)

    addNewNodeList(JSON.stringify(postData)).then(res => {
      if (res.data.code === 1) {
        setTimeout(hide)
        setRiskVal(res.data.scrynMaligant)
        setRes(res)
        setShowRisk(true)
      } else {
        message.error(`??????????????????????????????`)
        setTimeout(hide)
        setConfirmLoading(true)
        return false
      }
    })
  }

  // ????????????
  const showDeleteConfirm = item => {
    confirm({
      title: `??????????????????????????? ${imagesConfig.length - Number(item.num)} ????????????`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          ??????{item.lung} <br />
          ?????????{item.lobe} <br />
          ?????????{item.type} <br />
        </div>
      ),
      okText: '??????',
      okType: 'danger',
      cancelText: '??????',
      onOk() {
        const itemIndex = noduleList.findIndex(n => n.noduleNum === item.noduleNum)
        noduleList.splice(itemIndex, 1)
        setNoduleList([...noduleList])
        setNoduleInfo(null)

        saveResults(callback => {
          fetchDoctorData(callback => {
            updateCanvasAndList()
          })
        })
      },
      onCancel() {
        console.log('Cancel')
      },
    })
  }

  // ???????????????????????????
  const updateCanvasAndList = () => {
    const index = currentImageIdIndex
    setNoduleInfo(null)
    cornerstoneTools.clearToolState(cornerstoneElement, 'RectangleRoi')
    cornerstoneTools.clearToolState(cornerstoneElement, 'MarkNodule')
    cornerstone.updateImage(cornerstoneElement)
    addNodeTool(cornerstoneElement, index)
    setModalVisible(false)
  }

  const onStart = (event, uiData) => {
    const { clientWidth, clientHeight } = window.document.documentElement
    const targetRect = draggleRef.current?.getBoundingClientRect()
    if (!targetRect) {
      return
    }
    setModalBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    })
  }

  // ??????????????????
  const handleShowAdjustModal = () => {
    const tool = cornerstoneTools.getToolState(cornerstoneElement, 'MeasureRect')

    if (!tool || tool.data.length === 0) {
      message.warn(`?????????????????????????????????????????????????????????`)
      return false
    }

    if (tool.data.length > 1) {
      message.warn(`??????????????????????????????????????????????????????????????????`)
      return false
    }

    setAdjustModalVisible(true)
  }

  // ????????????????????????
  const handleAdjustNodeOk = () => {
    const checkItme = noduleList.find(item => item.checked === true)

    if (checkItme) {
      const tool = cornerstoneTools.getToolState(cornerstoneElement, 'MeasureRect')
      const toolData = tool.data[0]
      const data = tool.data[0].cachedStats
      // const handle = tool.data[0].handles
      const oldDiameter = checkItme.diameter.replace('*', '').split('mm')
      const oldArea = (oldDiameter[0] * oldDiameter[1]).toFixed(2)
      // let nodeBox = []
      if (checkItme.nodeType === 1) {
        checkItme.diameter = `${Math.abs(data.width.toFixed(2))}mm*${Math.abs(data.height.toFixed(2))}mm`
        checkItme.noduleSize = (checkItme.noduleSize * Math.pow(data.area / oldArea, 1.5)).toFixed(2)
      } else {
        checkItme.newDiameter = `${Math.abs(data.width.toFixed(2))}mm*${Math.abs(data.height.toFixed(2))}mm`
        checkItme.newNoduleSize = (checkItme.noduleSize * Math.pow(data.area / oldArea, 1.5)).toFixed(2)
      }

      // ????????????????????????
      checkItme.diameterSize = formatDiameter(
        `${Math.abs(data.width.toFixed(2))}mm*${Math.abs(data.height.toFixed(2))}mm`
      )

      // if (handle.start.x > handle.end.x) {
      //   nodeBox = [parseInt(handle.end.y), parseInt(handle.end.x), parseInt(handle.start.y), parseInt(handle.start.x)]
      // } else {
      //   nodeBox = [parseInt(handle.start.y), parseInt(handle.start.x), parseInt(handle.end.y), parseInt(handle.end.x)]
      // }

      // startX: rois.bbox[1],
      // startY: rois.bbox[0],
      // endX: rois.bbox[3],
      // endY: rois.bbox[2],

      // const startX = nodeBox[1]
      // const startY = nodeBox[0]
      // const endX = nodeBox[3]
      // const endY = nodeBox[2]

      // checkItme.nodeBox = nodeBox
      // checkItme.maxHu = data.max
      // checkItme.minHu = data.min
      // checkItme.meanHu = data.mean.toFixed(2)
      checkItme.diameterNorm = Math.sqrt(data.area).toFixed(2)
      // checkItme.centerHu = cornerstone.getPixels(
      //   cornerstoneElement,
      //   (Number(startX) + Number(endX)) / 2,
      //   (Number(startY) + Number(endY)) / 2,
      //   1,
      //   1
      // )[0]

      setNoduleList([...noduleList])

      // ?????????????????????????????????
      cornerstoneTools.removeToolState(cornerstoneElement, 'MeasureRect', toolData)
      cornerstone.updateImage(cornerstoneElement)
    }

    saveResults()
    setAdjustModalVisible(false)
  }

  const handleAdjustNodeCancel = () => {
    setAdjustModalVisible(false)
  }

  // ???????????????
  const [showMarkModal, setshowMarkModal] = useState(false)

  const handleShowMarkModal = () => {
    setshowMarkModal(true)
  }

  const handleMarkModalOk = () => {
    const checkItme = noduleList.find(item => item.checked === true)

    if (checkItme) {
      const oldDiameter = checkItme.diameter.replace('*', '').split('mm')
      const oldArea = (oldDiameter[0] * oldDiameter[1]).toFixed(2)
      const newArea = (0.99 * 0.99).toFixed(2)

      if (checkItme.nodeType === 1) {
        checkItme.diameter = `0.99mm*0.99mm`
        checkItme.noduleSize = (checkItme.noduleSize * Math.pow(newArea / oldArea, 1.5)).toFixed(2)
      } else {
        checkItme.newDiameter = `0.99mm*0.99mm`
        checkItme.newNoduleSize = (checkItme.noduleSize * Math.pow(newArea / oldArea, 1.5)).toFixed(2)
      }

      checkItme.diameterSize = formatDiameter(`0.99mm*0.99mm`)
      checkItme.diameterNorm = Math.sqrt(newArea).toFixed(2)

      setNoduleList([...noduleList])
    }

    saveResults()
    setshowMarkModal(false)
  }

  const handleMarkModalCancel = () => {
    setshowMarkModal(false)
  }

  return (
    <div className={pageType ? `viewer-${pageType}-box` : 'viewer-box'}>
      <Header
        data={patients}
        handleShowModal={handleShowModal}
        pageType={pageType}
        pageState={pageState}
        historyList={historyList}
      />
      <div className="viewer-center-box">
        <div className={showState ? 'middle-box-wrap-show' : 'middle-box-wrap-hide'}>
          <MiddleSidePanel
            handleVisibleChange={handleVisibleChange}
            handleCheckedListClick={handleCheckedListClick}
            handleHideNodule={handleHideNodule}
            onCheckChange={onCheckChange}
            onCheckAllChange={onCheckAllChange}
            showDeleteConfirm={showDeleteConfirm}
            showPopover={showPopover}
            indeterminate={indeterminate}
            checkAll={checkAll}
            noduleList={noduleList}
            noduleInfo={noduleInfo}
            imagesConfig={imagesConfig}
          />
        </div>
        <ViewerMain
          handleSliderChange={handleSliderChange}
          handleSubmitNodeDetail={handleSubmitNodeDetail}
          handleToolbarClick={handleToolbarClick}
          handleElementEnabledEvt={handleElementEnabledEvt}
          handleShowMarker={handleShowMarker}
          toolsConfig={toolsConfig}
          imagesConfig={imagesConfig}
          noduleList={noduleList}
          pageType={pageType}
          imageIdIndex={imageIdIndex}
          showMarker={showMarker}
        />
      </div>
      <NoduleInfo
        noduleInfo={noduleInfo}
        handleTextareaOnChange={handleTextareaOnChange}
        handleInputBlur={handleInputBlur}
        checkNoduleList={checkNoduleList}
        updateNoduleList={updateNoduleList}
        updateChiefNoduleList={updateChiefNoduleList}
        updateChiefMarkNode={updateChiefMarkNode}
        handleUpdateRisk={handleUpdateRisk}
        handleShowAdjustModal={handleShowAdjustModal}
        handleShowMarkModal={handleShowMarkModal}
        pageState={pageState}
      />
      {showMark ? (
        <MarkDialog handleCloseCallback={handleCloseCallback} handleSubmitCallback={handleSubmitCallback} />
      ) : null}

      <Modal
        title="????????????????????????"
        className="risk-modal"
        visible={showRisk}
        onOk={handleRiskOk}
        okText="??????"
        closable="false"
        keyboard="false"
        maskClosable="false"
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <p>??????????????????????????????</p>
          <InputNumber onChange={setRiskVal} value={riskVal} addonAfter="%" min={1} max={99} />
        </div>
      </Modal>

      <Modal
        title="????????????"
        maskClosable={false}
        visible={visible}
        onOk={handleSubmitResults}
        onCancel={hideModal}
        okText="??????"
        cancelText="??????"
        maskStyle={{ backgroundColor: 'transparent' }}
      >
        <p>??????????????????</p>
      </Modal>

      <Modal
        title="???????????????????????????"
        maskClosable={false}
        visible={adjustModalVisible}
        onOk={handleAdjustNodeOk}
        onCancel={handleAdjustNodeCancel}
        okText="??????"
        cancelText="??????"
        maskStyle={{ backgroundColor: 'transparent' }}
      >
        <p>???????????????????????????????????????????????????????????????????????????</p>
      </Modal>

      <Modal
        title="??????????????????"
        maskClosable={false}
        visible={showMarkModal}
        onOk={handleMarkModalOk}
        onCancel={handleMarkModalCancel}
        okText="??????"
        cancelText="??????"
        maskStyle={{ backgroundColor: 'transparent' }}
      >
        <p>??????????????????????????????????????????</p>
      </Modal>

      {pageType === 'review' ? (
        <div className="show-button">
          <Button onClick={showNoduleList}>{showState ? '??????????????????' : '??????????????????'}</Button>
          {getURLParameters(window.location.href).patientId &&
          getURLParameters(window.location.href).patientId !== 'null' ? (
            <span className="infor-detail">
              patientId: <em>{getURLParameters(window.location.href).patientId}</em>
            </span>
          ) : null}
        </div>
      ) : null}

      <Modal
        title={
          <div
            style={{
              width: '100%',
              cursor: 'move',
            }}
            onMouseOver={() => {
              if (modalDisabled) {
                setModalDisabled(false)
              }
            }}
            onMouseOut={() => {
              setModalDisabled(true)
            }}
            onFocus={() => {}}
            onBlur={() => {}}
            // end
          >
            ????????????
          </div>
        }
        okText={'??????'}
        cancelText={'??????'}
        visible={modalVisible}
        maskClosable={false}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={confirmLoading}
        modalRender={modal => (
          <Draggable disabled={modalDisabled} bounds={modalBounds} onStart={(event, uiData) => onStart(event, uiData)}>
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <AddNewNode
          handleToolListTextareaChange={handleToolListTextareaChange}
          handleToolListTextareaBlur={handleToolListTextareaBlur}
          updateToolList={updateToolList}
          currentImageIdIndex={currentImageIdIndex}
          toolList={toolList}
          imagesConfig={imagesConfig}
          cornerstoneElement={cornerstoneElement}
        />
      </Modal>
    </div>
  )
}

export default Viewer
