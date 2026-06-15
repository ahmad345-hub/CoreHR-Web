import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import ChatBot from '../ChatBot'
import MessagingSystem from '../MessagingSystem'

export default function Layout() {
  const { user, loading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return (
      <div className="spinner-wrap" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const toggle = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(o => !o)
    } else {
      setCollapsed(o => !o)
    }
  }

  return (
    <div className="app-wrapper">
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-area">
        <Navbar onToggleSidebar={toggle} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <ChatBot />
      <MessagingSystem />
    </div>
  )
}
