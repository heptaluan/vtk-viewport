import cornerstone from 'cornerstone-core'
import toolStyle from './toolStyle.js'
import toolColors from './toolColors'
import textStyle from './textStyle'

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

function getDefault(value, defaultValue) {
  return value === undefined ? defaultValue : value
}

function setShadow(context, options = {}) {
  if (options.shadow) {
    context.shadowColor = getDefault(options.shadowColor, '#000000')
    context.shadowBlur = getDefault(options.shadowBlur, 0)
    context.shadowOffsetX = getDefault(options.shadowOffsetX, 1)
    context.shadowOffsetY = getDefault(options.shadowOffsetY, 1)
  }
}

function drawHandles(context, evtDetail, handles, options = {}) {
  const element = evtDetail.element
  const defaultColor = toolColors.getToolColor()

  context.strokeStyle = options.color || defaultColor

  const handleKeys = Object.keys(handles)

  for (let i = 0; i < handleKeys.length; i++) {
    const handleKey = handleKeys[i]
    const handle = handles[handleKey]

    if (handle.drawnIndependently === true) {
      continue
    }

    if (options.drawHandlesIfActive === true && !handle.active) {
      continue
    }
    if (options.hideHandlesIfMoving && handle.moving) {
      continue
    }

    const lineWidth = handle.active ? toolStyle.getActiveWidth() : toolStyle.getToolWidth()
    const fillStyle = options.fill

    const pathOptions = { lineWidth, fillStyle }

    if (options.lineDash) {
      pathOptions.lineDash = options.lineDash
    }

    path(context, pathOptions, context => {
      const handleCanvasCoords = window.cornerstone.pixelToCanvas(element, handle)

      // Handle's radisu, then tool's radius, then default radius
      const handleRadius = handle.radius || options.handleRadius

      context.arc(handleCanvasCoords.x, handleCanvasCoords.y, handleRadius, 0, 2 * Math.PI)
    })
  }
}

function _determineCorners(handles) {
  const handlesLeftToRight = [handles.start, handles.end].sort(_compareX)
  const handlesTopToBottom = [handles.start, handles.end].sort(_compareY)
  const left = handlesLeftToRight[0]
  const right = handlesLeftToRight[handlesLeftToRight.length - 1]
  const top = handlesTopToBottom[0]
  const bottom = handlesTopToBottom[handlesTopToBottom.length - 1]

  return {
    top,
    left,
    bottom,
    right,
  }

  function _compareX(a, b) {
    return a.x < b.x ? -1 : 1
  }
  function _compareY(a, b) {
    return a.y < b.y ? -1 : 1
  }
}

function getROITextBoxCoords(viewport, handles) {
  const corners = _determineCorners(handles)
  const centerX = (corners.left.x + corners.right.x) / 2
  const centerY = (corners.top.y + corners.bottom.y) / 2
  const textBox = {}

  if (viewport.rotation >= 0 && viewport.rotation < 90) {
    textBox.x = viewport.hflip ? corners.left.x : corners.right.x
    textBox.y = centerY
  }
  if (viewport.rotation >= 90 && viewport.rotation < 180) {
    textBox.x = centerX
    textBox.y = viewport.vflip ? corners.bottom.y : corners.top.y
  }
  if (viewport.rotation >= 180 && viewport.rotation < 270) {
    textBox.x = viewport.hflip ? corners.right.x : corners.left.x
    textBox.y = centerY
  }
  if (viewport.rotation >= 270 && viewport.rotation < 360) {
    textBox.x = centerX
    textBox.y = viewport.vflip ? corners.top.y : corners.bottom.y
  }

  return textBox
}

function numbersWithCommas(x) {
  const parts = x.toString().split('.')

  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return parts.join('.')
}

function drawLinkedTextBox(
  context,
  element,
  textBox,
  text,
  handles,
  textBoxAnchorPoints,
  color,
  lineWidth,
  xOffset,
  yCenter
) {
  const { pixelToCanvas } = window.cornerstone

  // Convert the textbox Image coordinates into Canvas coordinates
  const textCoords = pixelToCanvas(element, textBox)

  if (xOffset) {
    textCoords.x += xOffset
  }

  const options = {
    centering: {
      x: false,
      y: yCenter,
    },
  }

  // Draw the text box
  textBox.boundingBox = drawTextBox(context, text, textCoords.x, textCoords.y, color, options)
  if (textBox.hasMoved) {
    // Identify the possible anchor points for the tool -> text line
    const linkAnchorPoints = textBoxAnchorPoints(handles).map(h => pixelToCanvas(element, h))

    // Draw dashed link line between tool and text
    drawLink(linkAnchorPoints, textCoords, textBox.boundingBox, context, color, lineWidth)
  }
}

function drawTextBox(context, textLines, x, y, color, options = {}) {
  if (Object.prototype.toString.call(textLines) !== '[object Array]') {
    textLines = [textLines]
  }

  const padding = 5
  const fontSize = textStyle.getFontSize()
  const backgroundColor = textStyle.getBackgroundColor()

  // Find the longest text width in the array of text data
  let maxWidth = 0

  textLines.forEach(function (text) {
    // Get the text width in the current font
    const width = textBoxWidth(context, text, padding)

    // Find the maximum with for all the text rows;
    maxWidth = Math.max(maxWidth, width)
  })

  // Calculate the bounding box for this text box
  const boundingBox = {
    width: maxWidth,
    height: padding + textLines.length * (fontSize + padding),
  }

  draw(context, context => {
    context.strokeStyle = color

    // Draw the background box with padding
    if (options.centering) {
      if (options.centering.x === true) {
        x -= boundingBox.width / 2
      }

      if (options.centering.y === true) {
        y -= boundingBox.height / 2
      }
    }

    boundingBox.left = x
    boundingBox.top = y

    // Check if a displacer function was provided
    if (typeof options.displacer === 'function') {
      options.displacer(boundingBox)
    }

    fillBox(context, boundingBox, backgroundColor)

    // Draw each of the text lines on top of the background box
    fillTextLines(context, boundingBox, textLines, color, padding)
  })

  // Return the bounding box so it can be used for pointNearHandle
  return boundingBox
}

function drawLink(linkAnchorPoints, refPoint, boundingBox, context, color, lineWidth) {
  // Draw a link from "the closest anchor point to refPoint" to "the nearest midpoint on the bounding box".

  // Find the closest anchor point to RefPoint
  const start =
    linkAnchorPoints.length > 0 ? window.cornerstoneMath.point.findClosestPoint(linkAnchorPoints, refPoint) : refPoint

  // Calculate the midpoints of the bounding box
  const boundingBoxPoints = [
    {
      x: boundingBox.left + boundingBox.width / 2,
      y: boundingBox.top,
    },
    {
      x: boundingBox.left,
      y: boundingBox.top + boundingBox.height / 2,
    },
    {
      x: boundingBox.left + boundingBox.width / 2,
      y: boundingBox.top + boundingBox.height,
    },
    {
      x: boundingBox.left + boundingBox.width,
      y: boundingBox.top + boundingBox.height / 2,
    },
  ]

  // Calculate the link endpoint by identifying which midpoint of the bounding box
  // Is closest to the start point.
  const end = window.cornerstoneMath.point.findClosestPoint(boundingBoxPoints, start)

  // Finally we draw the dashed linking line
  const options = {
    color,
    lineWidth,
    lineDash: [2, 3],
  }

  drawLine(context, undefined, start, end, options, 'canvas')
}

function drawLine(context, element, start, end, options, coordSystem = 'pixel') {
  path(context, options, context => {
    if (coordSystem === 'pixel') {
      start = window.cornerstone.pixelToCanvas(element, start)
      end = window.cornerstone.pixelToCanvas(element, end)
    }

    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
  })
}

function textBoxWidth(context, text, padding) {
  const font = textStyle.getFont()
  const origFont = context.font

  if (font && font !== origFont) {
    context.font = font
  }
  const width = context.measureText(text).width

  if (font && font !== origFont) {
    context.font = origFont
  }

  return width + 2 * padding
}

function fillBox(context, boundingBox, fillStyle) {
  context.fillStyle = fillStyle
  context.fillRect(boundingBox.left, boundingBox.top, boundingBox.width, boundingBox.height)
}

function fillTextLines(context, boundingBox, textLines, fillStyle, padding) {
  const fontSize = textStyle.getFontSize()

  context.font = textStyle.getFont()
  context.textBaseline = 'top'
  context.fillStyle = fillStyle
  textLines.forEach(function (text, index) {
    context.fillText(text, boundingBox.left + padding, boundingBox.top + padding + index * (fontSize + padding))
  })
}

function throttle(func, wait, options) {
  let leading = true
  let trailing = true

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  if (isObject(options)) {
    leading = 'leading' in options ? Boolean(options.leading) : leading
    trailing = 'trailing' in options ? Boolean(options.trailing) : trailing
  }

  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait,
  })
}

function isObject(value) {
  const type = typeof value

  return value !== null && (type === 'object' || type === 'function')
}

function debounce(func, wait, options) {
  let lastArgs, lastThis, maxWait, result, timerId, lastCallTime

  let lastInvokeTime = 0
  let leading = false
  let maxing = false
  let trailing = true

  // Bypass `requestAnimationFrame` by explicitly setting `wait=0`.
  const useRAF = !wait && wait !== 0 && typeof window.requestAnimationFrame === 'function'

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  wait = Number(wait) || 0
  if (isObject(options)) {
    leading = Boolean(options.leading)
    maxing = 'maxWait' in options
    maxWait = maxing ? Math.max(Number(options.maxWait) || 0, wait) : maxWait
    trailing = 'trailing' in options ? Boolean(options.trailing) : trailing
  }

  function invokeFunc(time) {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = lastThis = undefined
    lastInvokeTime = time
    result = func.apply(thisArg, args)

    return result
  }

  function startTimer(pendingFunc, wait) {
    if (useRAF) {
      return window.requestAnimationFrame(pendingFunc)
    }

    return setTimeout(pendingFunc, wait)
  }

  function cancelTimer(id) {
    if (useRAF) {
      return window.cancelAnimationFrame(id)
    }
    clearTimeout(id)
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time
    // Start the timer for the trailing edge.
    timerId = startTimer(timerExpired, wait)

    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result
  }

  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall

    return maxing ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting
  }

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait)
    )
  }

  function timerExpired() {
    const time = Date.now()

    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    // Restart the timer.
    timerId = startTimer(timerExpired, remainingWait(time))
  }

  function trailingEdge(time) {
    timerId = undefined

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = lastThis = undefined

    return result
  }

  function cancel() {
    if (timerId !== undefined) {
      cancelTimer(timerId)
    }
    lastInvokeTime = 0
    lastArgs = lastCallTime = lastThis = timerId = undefined
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now())
  }

  function pending() {
    return timerId !== undefined
  }

  function debounced(...args) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this // eslint-disable-line consistent-this
    lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime)
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = startTimer(timerExpired, wait)

        return invokeFunc(lastCallTime)
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait)
    }

    return result
  }
  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending

  return debounced
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
  setShadow,
  drawHandles,
  getROITextBoxCoords,
  numbersWithCommas,
  drawLinkedTextBox,
  throttle,
}
