import React from 'react'
import Router from './router'
import 'antd/dist/antd.css'
import './assets/scss/reset.scss'
import './assets/scss/common.scss'
import MPRViewer from './MPRViewer/MPRViewer'

const App = () => {
  return (
    <div className="App">
      <MPRViewer />
      <Router />
    </div>
  )
}

export default App
