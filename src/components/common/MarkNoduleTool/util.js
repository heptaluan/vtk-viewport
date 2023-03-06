import cornerstone from 'cornerstone-core'
import toolStyle from './toolStyle.js'

function getToolState(element, toolName) {
  const toolStateManager = getElementToolStateManager(element)
  return toolStateManager.get(element, toolName)
}

function getElementToolStateManager(element) {
  const enabledElement = cornerstone.getEnabledElement(element)
  return enabledElement.toolStateManager
}

function getNewContext(canvas) {
  const context = canvas.getContext('2d')
  context.setTransform(1, 0, 0, 1, 0, 0)
  return context
}

function draw(context, fn) {
  context.save()
  fn(context)
  context.restore()
}

function rotatePoint(point, center, angle) {
  const angleRadians = angle * (Math.PI / 180) // Convert to radians
  const rotatedX =
    Math.cos(angleRadians) * (point.x - center.x) - Math.sin(angleRadians) * (point.y - center.y) + center.x
  const rotatedY =
    Math.sin(angleRadians) * (point.x - center.x) + Math.cos(angleRadians) * (point.y - center.y) + center.y

  return {
    x: rotatedX,
    y: rotatedY,
  }
}

function path(context, options = {}, fn) {
  const { color, lineWidth, fillStyle, lineDash, shouldDrawLines = true } = options

  context.beginPath()
  context.strokeStyle = color || context.strokeStyle

  context.lineWidth = lineWidth || (lineWidth === undefined && toolStyle.getToolWidth()) || context.lineWidth
  if (lineDash) {
    context.setLineDash(lineDash)
  }

  fn(context)

  if (fillStyle) {
    context.fillStyle = fillStyle
    context.fill()
  }

  if (shouldDrawLines) {
    context.stroke()
  }

  if (lineDash) {
    context.setLineDash([])
  }
}

function drawRect(context, element, corner1, corner2, options, coordSystem = 'pixel', initialRotation = 0.0) {
  if (coordSystem === 'pixel') {
    corner1 = cornerstone.pixelToCanvas(element, corner1)
    corner2 = cornerstone.pixelToCanvas(element, corner2)
  }

  const viewport = cornerstone.getViewport(element)

  // Calculate the center of the image
  const { clientWidth: width, clientHeight: height } = element
  const { scale, translation } = viewport
  const rotation = viewport.rotation - initialRotation

  const centerPoint = {
    x: width / 2 + translation.x * scale,
    y: height / 2 + translation.y * scale,
  }

  if (Math.abs(rotation) > 0.05) {
    corner1 = rotatePoint(corner1, centerPoint, -rotation)
    corner2 = rotatePoint(corner2, centerPoint, -rotation)
  }

  const w = Math.abs(corner1.x - corner2.x)
  const h = Math.abs(corner1.y - corner2.y)

  corner1 = {
    x: Math.min(corner1.x, corner2.x),
    y: Math.min(corner1.y, corner2.y),
  }

  corner2 = {
    x: corner1.x + w,
    y: corner1.y + h,
  }

  let corner3 = {
    x: corner1.x + w,
    y: corner1.y,
  }

  let corner4 = {
    x: corner1.x,
    y: corner1.y + h,
  }

  if (Math.abs(rotation) > 0.05) {
    corner1 = rotatePoint(corner1, centerPoint, rotation)
    corner2 = rotatePoint(corner2, centerPoint, rotation)
    corner3 = rotatePoint(corner3, centerPoint, rotation)
    corner4 = rotatePoint(corner4, centerPoint, rotation)
  }

  path(context, options, context => {
    context.moveTo(corner1.x, corner1.y)
    context.lineTo(corner3.x, corner3.y)
    context.lineTo(corner2.x, corner2.y)
    context.lineTo(corner4.x, corner4.y)
    context.lineTo(corner1.x, corner1.y)
  })
}

function getPixelSpacing(image) {
  const imagePlane = cornerstone.metaData.get('imagePlaneModule', image.imageId)

  if (imagePlane) {
    return {
      rowPixelSpacing: imagePlane.rowPixelSpacing || imagePlane.rowImagePixelSpacing,
      colPixelSpacing: imagePlane.columnPixelSpacing || imagePlane.colImagePixelSpacing,
    }
  }

  return {
    rowPixelSpacing: image.rowPixelSpacing,
    colPixelSpacing: image.columnPixelSpacing,
  }
}

function calculateSUV(image, storedPixelValue, skipRescale = false) {
  const patientStudyModule = cornerstone.metaData.get('patientStudyModule', image.imageId)
  const seriesModule = cornerstone.metaData.get('generalSeriesModule', image.imageId)

  if (!patientStudyModule || !seriesModule) {
    return
  }

  const modality = seriesModule.modality

  // Image must be PET
  if (modality !== 'PT') {
    return
  }

  const modalityPixelValue = skipRescale ? storedPixelValue : storedPixelValue * image.slope + image.intercept

  const patientWeight = patientStudyModule.patientWeight // In kg

  if (!patientWeight) {
    return
  }

  const petSequenceModule = cornerstone.metaData.get('petIsotopeModule', image.imageId)

  if (!petSequenceModule) {
    return
  }

  const radiopharmaceuticalInfo = petSequenceModule.radiopharmaceuticalInfo
  const startTime = radiopharmaceuticalInfo.radiopharmaceuticalStartTime
  const totalDose = radiopharmaceuticalInfo.radionuclideTotalDose
  const halfLife = radiopharmaceuticalInfo.radionuclideHalfLife
  const seriesAcquisitionTime = seriesModule.seriesTime

  if (!startTime || !totalDose || !halfLife || !seriesAcquisitionTime) {
    return
  }

  const acquisitionTimeInSeconds =
    fracToDec(seriesAcquisitionTime.fractionalSeconds || 0) +
    seriesAcquisitionTime.seconds +
    seriesAcquisitionTime.minutes * 60 +
    seriesAcquisitionTime.hours * 60 * 60
  const injectionStartTimeInSeconds =
    fracToDec(startTime.fractionalSeconds || 0) + startTime.seconds + startTime.minutes * 60 + startTime.hours * 60 * 60
  const durationInSeconds = acquisitionTimeInSeconds - injectionStartTimeInSeconds
  const correctedDose = totalDose * Math.exp((-durationInSeconds * Math.log(2)) / halfLife)
  const suv = ((modalityPixelValue * patientWeight) / correctedDose) * 1000

  return suv
}

/**
 * Returns a decimal value given a fractional value.
 * @private
 * @method
 * @name fracToDec
 *
 * @param  {number} fractionalValue The value to convert.
 * @returns {number}                 The value converted to decimal.
 */
function fracToDec(fractionalValue) {
  return parseFloat(`.${fractionalValue}`)
}

export {
  getToolState,
  getElementToolStateManager,
  getNewContext,
  rotatePoint,
  draw,
  path,
  drawRect,
  getPixelSpacing,
  calculateSUV,
}
