import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'

// Each nav item maps to a permission key (uses .view by default)
const NAV = [
  {
    sectionKey: 'main',
    items: [
      { path: '/dashboard', key: 'dashboard', icon: 'grid-outline', permKey: 'dashboard' },
    ],
  },
  {
    sectionKey: 'workforce',
    items: [
      { path: '/employees',  key: 'employees',  icon: 'people-outline', permKey: 'employees.view' },
      { path: '/attendance', key: 'attendance', icon: 'time-outline', permKey: 'attendance.view' },
      { path: '/leave',      key: 'leave',      icon: 'calendar-outline', permKey: 'leave.view' },
    ],
  },
  {
    sectionKey: 'talent',
    items: [
      { path: '/recruitment',  key: 'recruitment',  icon: 'briefcase-outline', permKey: 'recruitment.view' },
      { path: '/onboarding',   key: 'onboarding',   icon: 'person-add-outline', permKey: 'onboarding.view' },
      { path: '/offboarding',  key: 'offboarding',  icon: 'log-out-outline', permKey: 'offboarding.view' },
      { path: '/performance',  key: 'performance',  icon: 'trending-up-outline', permKey: 'performance.view' },
    ],
  },
  {
    sectionKey: 'finance',
    items: [
      { path: '/payroll', key: 'payroll', icon: 'cash-outline', permKey: 'payroll.view' },
    ],
  },
  {
    sectionKey: 'operations',
    items: [
      { path: '/helpdesk', key: 'helpdesk', icon: 'headset-outline', permKey: 'helpdesk.view' },
      { path: '/assets',   key: 'assets',   icon: 'laptop-outline', permKey: 'assets.view' },
      { path: '/projects', key: 'projects', icon: 'folder-outline', permKey: 'projects.view' },
    ],
  },
  {
    sectionKey: 'analytics',
    items: [
      { path: '/reports', key: 'reports', icon: 'bar-chart-outline', permKey: 'reports.view' },
    ],
  },
  {
    sectionKey: 'system',
    items: [
      { path: '/settings', key: 'settings', icon: 'settings-outline', permKey: 'settings.view' },
      { path: '/settings/permissions', key: 'permissions', icon: 'shield-checkmark-outline', permKey: null },
    ],
  },
]

export default function Sidebar({ collapsed, mobileOpen }) {
  const { user } = useAuth()
  const { t } = useLang()
  const permissions = user?.permissions || {}
  const isSuperuser = user?.is_superuser

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">C</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">CoreHR</div>
          <div className="sidebar-logo-sub">HR Management</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ sectionKey, items }) => {
          const visibleItems = items.filter(({ permKey }) => {
            // Super admin sees everything
            if (isSuperuser) return true
            // Permissions page is super admin only (permKey: null)
            if (permKey === null) return false
            // Check individual permission
            return permissions[permKey] === true
          })
          if (visibleItems.length === 0) return null
          return (
          <div className="sidebar-section" key={sectionKey}>
            <div className="sidebar-section-label">{t(`nav.sections.${sectionKey}`)}</div>
            {visibleItems.map(({ path, key, icon }) => {
              const label = t(`nav.items.${key}`)
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title={collapsed ? label : undefined}
                >
                  <span className="sidebar-icon">
                    <ion-icon name={icon} />
                  </span>
                  <span className="sidebar-label">{label}</span>
                </NavLink>
              )
            })}
          </div>
          )
        })}
      </nav>
    </aside>
  )
}
