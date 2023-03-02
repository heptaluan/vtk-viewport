import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import reportWebVitals from './reportWebVitals'
import initCornerstone from './initCornerstone.js'

// 初始化
initCornerstone()

ReactDOM.render(<App />, document.getElementById('root'))

reportWebVitals()
