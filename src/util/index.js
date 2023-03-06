/* eslint-disable no-sequences */
export const getURLParameters = url =>
  (url.match(/([^?=&]+)(=([^&]*))/g) || []).reduce(
    (a, v) => ((a[v.slice(0, v.indexOf('='))] = v.slice(v.indexOf('=') + 1)), a),
    {}
  )

// 格式化中心直径
export const formatDiameter = diameter => {
  if (diameter) {
    return Math.max(...diameter.replace('*', '').split('mm'))
  } else {
    return ''
  }
}

// 根据结节类型调整背景颜色
export const formatNodeStyle = item => {
  const maxSize = Number(localStorage.getItem('diameterSize'))
  const diameterSize = formatDiameter(item.diameter)
  const newDiameterSize = formatDiameter(item.newDiameter)
  if (newDiameterSize) {
    if (diameterSize <= maxSize && newDiameterSize >= maxSize) {
      return 'blue-item'
    } else if (diameterSize <= maxSize && newDiameterSize <= maxSize) {
      return 'green-item'
    } else if (diameterSize >= maxSize && newDiameterSize <= maxSize) {
      return 'red-item'
    }
  } else {
    if (diameterSize <= maxSize) {
      return 'green-item'
    }
  }
}

// 格式化微小结节
export const formatMiniNode = val => {
  if (!val) {
    return '-'
  }
  const maxSize = Number(localStorage.getItem('diameterSize'))
  const diameterSize = formatDiameter(val)
  if (diameterSize >= maxSize) {
    return val
  } else {
    return '微小结节'
  }
}

// 计算微小结节个数
export const formatMiniNodule = list => {
  const maxSize = Number(localStorage.getItem('diameterSize'))
  const target = []
  for (let i = 0; i < list.length; i++) {
    if (list[i].diameterSize <= maxSize) {
      target.push(list[i])
    }
  }
  return target.length
}
