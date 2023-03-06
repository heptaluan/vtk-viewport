import csTools from 'cornerstone-tools'
import toolColors from './toolColors.js'
import { getToolState, getNewContext, draw, drawRect, getPixelSpacing, calculateSUV } from './util'

const BaseAnnotationTool = csTools.importInternal('base/BaseAnnotationTool')

export default class MarkNoduleTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'MarkNodule',
      supportedInteractionTypes: ['Mouse'],
      configuration: {
        drawHandles: false,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: true,
        renderDashed: false,
      },
    }

    super(props, defaultProps)
  }

  handleSelectedCallback(e) {
    // 覆盖父类方法，禁止工具选中
  }

  createNewMeasurement(eventData) {
    return {
      visible: true,
      active: false,
      color: undefined,
      invalidated: true,
      handles: {
        start: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: false,
          active: false,
        },
        end: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: false,
          active: false,
        },
      },
    }
  }

  pointNearTool(element, data, coords, interactionType) {
    return false
  }

  // 获取工具框选的信息
  updateCachedStats(image, element, data) {
    const seriesModule = window.cornerstone.metaData.get('generalSeriesModule', image.imageId) || {}
    const modality = seriesModule.modality
    const pixelSpacing = getPixelSpacing(image)

    const stats = _calculateStats(image, element, data.handles, modality, pixelSpacing)

    data.cachedStats = stats
    data.invalidated = false
  }

  renderToolData(evt) {
    const toolData = getToolState(evt.currentTarget, this.name)
    localStorage.setItem('active', 'false')

    if (!toolData) {
      return
    }

    if (toolData.data[0]) {
      localStorage.setItem('active', 'true')
    } else {
      localStorage.setItem('active', 'false')
    }

    const eventData = evt.detail
    const { element } = eventData
    const context = getNewContext(eventData.canvasContext.canvas)

    draw(context, context => {
      // If we have tool data for this element - iterate over each set and draw it
      for (let i = 0; i < toolData.data.length; i++) {
        const data = toolData.data[i]

        if (data.visible === false) {
          continue
        }

        // Configure
        const color = toolColors.getColorIfActive(data)

        const rectOptions = { color }

        // Draw
        drawRect(
          context,
          element,
          data.handles.start,
          data.handles.end,
          rectOptions,
          'pixel',
          data.handles.initialRotation
        )
      }
    })
  }
}

function _getRectangleImageCoordinates(startHandle, endHandle) {
  return {
    left: Math.min(startHandle.x, endHandle.x),
    top: Math.min(startHandle.y, endHandle.y),
    width: Math.abs(startHandle.x - endHandle.x),
    height: Math.abs(startHandle.y - endHandle.y),
  }
}

function _calculateRectangleStats(sp, rectangle) {
  let sum = 0
  let sumSquared = 0
  let count = 0
  let index = 0
  let min = sp ? sp[0] : null
  let max = sp ? sp[0] : null

  for (let y = rectangle.top; y < rectangle.top + rectangle.height; y++) {
    for (let x = rectangle.left; x < rectangle.left + rectangle.width; x++) {
      sum += sp[index]
      sumSquared += sp[index] * sp[index]
      min = Math.min(min, sp[index])
      max = Math.max(max, sp[index])
      count++ // TODO: Wouldn't this just be sp.length?
      index++
    }
  }

  if (count === 0) {
    return {
      count,
      mean: 0.0,
      variance: 0.0,
      stdDev: 0.0,
      min: 0.0,
      max: 0.0,
    }
  }

  const mean = sum / count
  const variance = sumSquared / count - mean * mean

  return {
    count,
    mean,
    variance,
    stdDev: Math.sqrt(variance),
    min,
    max,
  }
}

function _calculateStats(image, element, handles, modality, pixelSpacing) {
  // Retrieve the bounds of the rectangle in image coordinates
  const roiCoordinates = _getRectangleImageCoordinates(handles.start, handles.end)

  // Retrieve the array of pixels that the rectangle bounds cover
  const pixels = window.cornerstone.getPixels(
    element,
    roiCoordinates.left,
    roiCoordinates.top,
    roiCoordinates.width,
    roiCoordinates.height
  )

  // Calculate the mean & standard deviation from the pixels and the rectangle details
  const roiMeanStdDev = _calculateRectangleStats(pixels, roiCoordinates)

  let meanStdDevSUV

  if (modality === 'PT') {
    meanStdDevSUV = {
      mean: calculateSUV(image, roiMeanStdDev.mean, true) || 0,
      stdDev: calculateSUV(image, roiMeanStdDev.stdDev, true) || 0,
    }
  }

  // Calculate the image area from the rectangle dimensions and pixel spacing
  const area =
    roiCoordinates.width *
    (pixelSpacing.colPixelSpacing || 1) *
    (roiCoordinates.height * (pixelSpacing.rowPixelSpacing || 1))

  const perimeter =
    roiCoordinates.width * 2 * (pixelSpacing.colPixelSpacing || 1) +
    roiCoordinates.height * 2 * (pixelSpacing.rowPixelSpacing || 1)

  return {
    area: area || 0,
    perimeter,
    count: roiMeanStdDev.count || 0,
    mean: roiMeanStdDev.mean || 0,
    variance: roiMeanStdDev.variance || 0,
    stdDev: roiMeanStdDev.stdDev || 0,
    min: roiMeanStdDev.min || 0,
    max: roiMeanStdDev.max || 0,
    meanStdDevSUV,
  }
}
