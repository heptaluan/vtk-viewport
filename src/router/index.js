import React from 'react'
import { renderRoutes } from 'react-router-config'
import { BrowserRouter } from 'react-router-dom'
import routes from './config'

const Router = () => {
  return (
    <>
      <BrowserRouter basename='/ct/'>{renderRoutes(routes)}</BrowserRouter>
    </>
  )
}

export default Router
