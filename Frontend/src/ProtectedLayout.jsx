import React from 'react'
import Sidebar from './components/Sidebar'
import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'

const ProtectedLayout = () => {
  return (
    <Sidebar>
      <Navbar/>
        <Outlet/>
    </Sidebar>
  )
}

export default ProtectedLayout