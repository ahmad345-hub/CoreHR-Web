import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'

const MODULE_ICONS = {
  'Onboarding':           { icon: 'person-add-outline',    color: '#40916c', bg: '#d8f3dc' },
  'Offboarding':          { icon: 'log-out-outline',       color: '#ef4444', bg: '#fee2e2' },
  'Performance Management': { icon: 'trending-up-outline', color: '#8b5cf6', bg: '#ede9fe' },
  'Helpdesk':             { icon: 'headset-outline',       color: '#3b82f6', bg: '#dbeafe' },
  'Asset Management':     { icon: 'laptop-outline',        color: '#f59e0b', bg: '#fef3c7' },
  'Projects':             { icon: 'folder-outline',        color: '#1a3c2e', bg: '#d8f3dc' },
  'Reports':              { icon: 'bar-chart-outline',     color: '#2d6a4f', bg: '#d8f3dc' },
  'Settings':             { icon: 'settings-outline',      color: '#6b7280', bg: '#f3f4f6' },
}

const FEATURE_SETS = {
  'Onboarding': ['Onboarding task checklists', 'Employee onboarding assignments', 'Task completion tracking', 'Document collection', 'Team introduction workflows'],
  'Offboarding': ['Exit task management', 'Asset return tracking', 'Access revocation checklists', 'Exit interviews', 'Final payroll processing'],
  'Performance Management': ['Goal setting & OKRs', '360° performance reviews', 'Continuous feedback', 'Performance ratings', 'Bonus point management'],
  'Helpdesk': ['Support ticket management', 'Category-based routing', 'Priority queues', 'Agent assignment', 'FAQ & knowledge base'],
  'Asset Management': ['Asset inventory tracking', 'Employee asset allocation', 'Return & maintenance', 'Asset categories', 'Depreciation tracking'],
  'Projects': ['Project kanban boards', 'Task management', 'Timesheet logging', 'Team assignments', 'Project analytics'],
  'Reports': ['Headcount reports', 'Attendance analytics', 'Leave usage reports', 'Payroll reports', 'Recruitment funnel'],
  'Settings': ['Company & branch setup', 'Department management', 'Job positions', 'Shift & work type config', 'Holiday calendar'],
}

export default function ModulePlaceholder({ title, description }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const meta  = MODULE_ICONS[title] || MODULE_ICONS['Settings']
  const feats = FEATURE_SETS[title] || []

  return (
    <div className="page-wrapper">
      <div style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ width: 80, height: 80, borderRadius: 20, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem' }}>
          <ion-icon name={meta.icon} style={{ color: meta.color }} />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--t-dark)', marginBottom: 12 }}>{title}</h1>
        <p style={{ color: 'var(--t-muted)', fontSize: '1rem', marginBottom: 32, lineHeight: 1.6 }}>
          {description}
        </p>

        {/* Feature list */}
        {feats.length > 0 && (
          <div className="card" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="card-header">
              <span className="card-title">{t('module.features')}</span>
              <span className="badge badge-success">{t('module.available')}</span>
            </div>
            <div className="card-body">
              {feats.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < feats.length - 1 ? '1px solid var(--t-border)' : 'none' }}>
                  <ion-icon name="checkmark-circle-outline" style={{ color: 'var(--t-accent)', fontSize: '1rem', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backend ready note */}
        <div className="alert alert-info" style={{ textAlign: 'left' }}>
          {t('module.backendReady')}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>{t('module.goBack')}</button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <ion-icon name="grid-outline" /> {t('module.dashboard')}
          </button>
        </div>
      </div>
    </div>
  )
}
