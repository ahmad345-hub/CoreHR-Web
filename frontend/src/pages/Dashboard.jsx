import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { usePerms } from '../hooks/usePerms'
import api from '../api/client'
import BirthdayAnimation from '../components/birthday/BirthdayAnimation'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#e5e7eb' }, ticks: { font: { size: 11 } } },
  },
}
const DOUGHNUT_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } } },
}

const GREEN_PALETTE = ['#1a3c2e','#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#b7e4c7','#d8f3dc']

export default function Dashboard() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const { can } = usePerms()
  const [stats, setStats]       = useState(null)
  const [trend, setTrend]       = useState([])
  const [deptDist, setDeptDist] = useState([])
  const [activity, setActivity] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showBirthday, setShowBirthday] = useState(false)

  useEffect(() => {
    const shown = localStorage.getItem('birthdayShown')
    if (!shown) setShowBirthday(true)

    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/attendance-trend'),
      api.get('/dashboard/department-distribution'),
      api.get('/dashboard/recent-activity'),
      api.get('/dashboard/birthdays'),
      api.get('/dashboard/announcements'),
      api.get('/insights').catch(() => ({ data: [] })),
    ]).then(([s, tr, d, a, b, ann, ins]) => {
      setStats(s.data)
      setTrend(tr.data)
      setDeptDist(d.data)
      setActivity(a.data)
      setBirthdays(b.data)
      setAnnouncements(ann.data)
      setInsights(ins.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>

  const hour = new Date().getHours()
  const greeting = hour < 12
    ? t('dashboard.goodMorning')
    : hour < 18
      ? t('dashboard.goodAfternoon')
      : t('dashboard.goodEvening')

  const trendChart = {
    labels: trend.map(r => r.date?.slice(5)),
    datasets: [{
      label: t('dashboard.present'),
      data: trend.map(r => r.present),
      backgroundColor: 'rgba(64,145,108,0.7)',
      borderColor: '#40916c',
      borderRadius: 6,
    }],
  }
  const deptChart = {
    labels: deptDist.map(r => r.name),
    datasets: [{
      data: deptDist.map(r => r.count),
      backgroundColor: GREEN_PALETTE,
      borderWidth: 0,
    }],
  }

  return (
    <>
      {showBirthday && <BirthdayAnimation onDone={() => setShowBirthday(false)} />}

      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {greeting}, {user?.first_name} 👋
            </h1>
            <p className="page-subtitle">{t('dashboard.subtitle')}</p>
          </div>
          <div className="page-actions">
            {can('reports.view') && (
              <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
                <ion-icon name="bar-chart-outline" /> {t('dashboard.reports')}
              </button>
            )}
            {can('employees.create') && (
              <button className="btn btn-primary" onClick={() => navigate('/employees')}>
                <ion-icon name="person-add-outline" /> {t('dashboard.addEmployee')}
              </button>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div className="stat-grid">
            {can('employees.view') && (
            <div className="stat-card stat-card--success" onClick={() => navigate('/employees')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="people-outline" /></div>
                <span className="stat-card-badge">+{stats.new_this_month} {t('dashboard.thisMonth')}</span>
              </div>
              <div className="stat-card-count">{stats.total_employees}</div>
              <div className="stat-card-label">{t('dashboard.totalEmployees')}</div>
            </div>
            )}

            <div className="stat-card stat-card--info" onClick={() => navigate('/attendance')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="checkmark-circle-outline" /></div>
                <span className="stat-card-badge">{stats.total_employees ? Math.round(stats.present_today / stats.total_employees * 100) : 0}% {t('dashboard.rate')}</span>
              </div>
              <div className="stat-card-count">{stats.present_today}</div>
              <div className="stat-card-label">{t('dashboard.presentToday')}</div>
            </div>

            <div className="stat-card stat-card--warning" onClick={() => navigate('/leave')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="calendar-outline" /></div>
                <span className="stat-card-badge">{stats.pending_leaves} {t('dashboard.pendingBadge')}</span>
              </div>
              <div className="stat-card-count">{stats.on_leave_today}</div>
              <div className="stat-card-label">{t('dashboard.onLeaveToday')}</div>
            </div>

            {can('attendance.manage') && (
            <div className="stat-card stat-card--danger" onClick={() => navigate('/attendance')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="close-circle-outline" /></div>
              </div>
              <div className="stat-card-count">{stats.absent_today}</div>
              <div className="stat-card-label">{t('dashboard.absentToday')}</div>
            </div>
            )}

            {can('recruitment.view') && (
            <div className="stat-card stat-card--purple" onClick={() => navigate('/recruitment')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="briefcase-outline" /></div>
                <span className="stat-card-badge">{stats.total_candidates} {t('dashboard.candidatesBadge')}</span>
              </div>
              <div className="stat-card-count">{stats.open_positions}</div>
              <div className="stat-card-label">{t('dashboard.openPositions')}</div>
            </div>
            )}

            {can('payroll.manage') && (
            <div className="stat-card stat-card--warning" onClick={() => navigate('/payroll')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="cash-outline" /></div>
                <span className="stat-card-badge">{stats.draft_payslips} {t('dashboard.draftBadge')}</span>
              </div>
              <div className="stat-card-count">${(stats.total_payroll_this_month / 1000).toFixed(0)}K</div>
              <div className="stat-card-label">{t('dashboard.payrollThisMonth')}</div>
            </div>
            )}

            <div className="stat-card stat-card--info" onClick={() => navigate('/helpdesk')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="headset-outline" /></div>
              </div>
              <div className="stat-card-count">{stats.open_tickets}</div>
              <div className="stat-card-label">{t('dashboard.openTickets')}</div>
            </div>

            {can('projects.view') && (
            <div className="stat-card stat-card--success" onClick={() => navigate('/projects')}>
              <div className="stat-card-header">
                <div className="stat-card-icon"><ion-icon name="folder-outline" /></div>
                <span className="stat-card-badge">{stats.expiring_contracts} {t('dashboard.expiringBadge')}</span>
              </div>
              <div className="stat-card-count">{stats.active_projects}</div>
              <div className="stat-card-label">{t('dashboard.activeProjects')}</div>
            </div>
            )}
          </div>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--t-border)' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ion-icon name="sparkles" style={{ color: '#f59e0b', fontSize: 20 }} />
                {lang === 'ar' ? 'تحليلات ذكية' : 'AI Smart Insights'}
              </span>
              <span className="badge badge-info" style={{ fontSize: 11 }}>{insights.length} {lang === 'ar' ? 'تنبيه' : 'insights'}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {insights.map((insight, i) => {
                const colors = { danger: '#dc3545', warning: '#f59e0b', success: '#40916c', info: '#0dcaf0', neutral: '#6c757d' }
                const bgColors = { danger: 'rgba(220,53,69,0.06)', warning: 'rgba(245,158,11,0.06)', success: 'rgba(64,145,108,0.06)', info: 'rgba(13,202,240,0.06)', neutral: 'rgba(108,117,125,0.04)' }
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px',
                    borderBottom: i < insights.length - 1 ? '1px solid var(--t-border)' : 'none',
                    background: bgColors[insight.type] || bgColors.neutral,
                    transition: 'background 0.15s',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: colors[insight.type] + '18', color: colors[insight.type],
                      fontSize: 18,
                    }}>
                      <ion-icon name={insight.icon + '-outline'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: colors[insight.type] }}>
                        {lang === 'ar' ? insight.title_ar : insight.title_en}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--t-text-muted)', lineHeight: 1.5 }}>
                        {lang === 'ar' ? insight.desc_ar : insight.desc_en}
                      </div>
                    </div>
                    <span className="badge" style={{ background: colors[insight.type] + '18', color: colors[insight.type], fontSize: 10, textTransform: 'capitalize', flexShrink: 0 }}>
                      {insight.category}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className={can('reports.view') ? 'grid-2' : ''} style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('dashboard.attendanceTrend')}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/attendance')}>{t('dashboard.viewAll')}</button>
            </div>
            <div className="card-body" style={{ height: 220 }}>
              <Bar data={trendChart} options={CHART_OPTS} />
            </div>
          </div>

          {can('reports.view') && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('dashboard.byDepartment')}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/reports')}>{t('dashboard.viewAll')}</button>
            </div>
            <div className="card-body" style={{ height: 220 }}>
              <Doughnut data={deptChart} options={DOUGHNUT_OPTS} />
            </div>
          </div>
          )}
        </div>

        {/* Activity & Birthdays */}
        <div className="grid-2">
          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('dashboard.recentActivity')}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {activity.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">{t('dashboard.noRecentActivity')}</div></div>
              ) : (
                <div className="timeline" style={{ padding: '8px 20px' }}>
                  {activity.map((item, i) => (
                    <div className="timeline-item" key={i}>
                      <div className={`timeline-dot ${item.type === 'new_employee' ? 'timeline-dot--info' : ''}`} />
                      <div className="timeline-body">
                        <div className="timeline-title">{item.actor}</div>
                        <div className="timeline-meta">{item.detail} · {new Date(item.time).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Birthdays + Announcements */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('dashboard.birthdaysThisMonth')}</span>
              </div>
              <div className="card-body" style={{ padding: '12px 20px' }}>
                {birthdays.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px' }}>
                    <div className="empty-state-text">{t('dashboard.noBirthdays')}</div>
                  </div>
                ) : (
                  birthdays.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < birthdays.length - 1 ? '1px solid var(--t-border)' : 'none' }}>
                      <div className="avatar">{b.first_name?.[0]}{b.last_name?.[0]}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{b.first_name} {b.last_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{b.department_name} · {b.dob?.slice(5)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">{t('dashboard.announcements')}</span></div>
              <div className="card-body" style={{ padding: '12px 20px' }}>
                {announcements.map((a, i) => (
                  <div key={a.id} style={{ paddingBottom: i < announcements.length - 1 ? 12 : 0, marginBottom: i < announcements.length - 1 ? 12 : 0, borderBottom: i < announcements.length - 1 ? '1px solid var(--t-border)' : 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{a.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{a.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
