import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropRef = useRef()

  // Map path → translation key
  const PAGE_KEYS = {
    '/dashboard':   'dashboard',   '/employees':   'employees',
    '/attendance':  'attendance',  '/leave':       'leave',
    '/recruitment': 'recruitment', '/onboarding':  'onboarding',
    '/offboarding': 'offboarding', '/performance': 'performance',
    '/payroll':     'payroll',     '/helpdesk':    'helpdesk',
    '/assets':      'assets',      '/projects':    'projects',
    '/reports':     'reports',     '/settings':    'settings',
    '/profile':     'profile',
  }

  const pageKey = PAGE_KEYS[location.pathname]
  const pageName = pageKey ? t(`pages.${pageKey}.title`) : ''

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U'

  const roleLabel = user?.is_superuser
    ? t('navbar.superAdmin')
    : user?.is_staff
      ? t('navbar.hrManager')
      : t('navbar.employee')

  useEffect(() => {
    api.get('/notifications').then(res => {
      setNotifications(res.data)
      setUnreadCount(res.data.filter(n => !n.is_read).length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const markRead = async id => {
    await api.put(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await api.post('/notifications/read-all')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    setUnreadCount(0)
  }

  return (
    <>
      <nav className="navbar">
        {/* Left */}
        <div className="navbar-left">
          <button className="navbar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
            <ion-icon name="menu-outline" />
          </button>
          <div className="navbar-breadcrumb">
            <span>CoreHR</span>
            {pageName && (
              <>
                <ion-icon name="chevron-forward-outline" style={{ fontSize: '0.7rem' }} />
                <span className="current">{pageName}</span>
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="navbar-right">
          {/* Language toggle */}
          <button
            className="navbar-icon-btn"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            style={{ fontWeight: 700, fontSize: '0.75rem', width: 'auto', padding: '0 10px', gap: 4 }}
          >
            <ion-icon name="language-outline" style={{ fontSize: '1rem' }} />
            {lang === 'en' ? 'AR' : 'EN'}
          </button>

          {/* Notifications */}
          <button className="navbar-icon-btn" onClick={() => setNotifOpen(true)} title={t('navbar.notifications')}>
            <ion-icon name="notifications-outline" />
            {unreadCount > 0 && <span className="notif-badge" />}
          </button>

          {/* Settings */}
          <button className="navbar-icon-btn" onClick={() => navigate('/settings')} title={t('navbar.settings')}>
            <ion-icon name="settings-outline" />
          </button>

          {/* User */}
          <div style={{ position: 'relative' }} ref={dropRef}>
            <div className="navbar-user" onClick={() => setDropdownOpen(o => !o)}>
              <div className="navbar-avatar">{initials}</div>
              <div>
                <div className="navbar-user-name">{user?.first_name} {user?.last_name}</div>
                <div className="navbar-user-role">{roleLabel}</div>
              </div>
              <ion-icon name="chevron-down-outline" style={{ fontSize: '0.8rem', color: 'var(--t-muted)' }} />
            </div>

            {dropdownOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="name">{user?.first_name} {user?.last_name}</div>
                  <div className="email">{user?.email}</div>
                </div>
                <button className="user-dropdown-item" onClick={() => { navigate('/profile'); setDropdownOpen(false) }}>
                  <ion-icon name="person-outline" />
                  {t('navbar.myProfile')}
                </button>
                <button className="user-dropdown-item" onClick={() => { navigate('/settings'); setDropdownOpen(false) }}>
                  <ion-icon name="settings-outline" />
                  {t('navbar.settings')}
                </button>
                <button className="user-dropdown-item danger" onClick={handleLogout}>
                  <ion-icon name="log-out-outline" />
                  {t('navbar.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Notification Panel */}
      <div className={`notif-panel ${notifOpen ? 'open' : ''}`}>
        <div className="notif-panel-header">
          <span className="notif-panel-title">{t('navbar.notifications')}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={markAllRead}>{t('navbar.markAllRead')}</button>
            )}
            <button className="navbar-toggle" onClick={() => setNotifOpen(false)}>
              <ion-icon name="close-outline" />
            </button>
          </div>
        </div>
        <div className="notif-panel-body">
          {notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🔔</div>
              <div className="empty-state-title">{t('navbar.noNotifications')}</div>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => markRead(n.id)}
              >
                {!n.is_read && <div className="notif-item-dot" />}
                <div style={n.is_read ? { marginLeft: 20 } : {}}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-time">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {notifOpen && <div className="sidebar-overlay" onClick={() => setNotifOpen(false)} style={{ zIndex: 249 }} />}
    </>
  )
}
