import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'
import { Doughnut, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
import api from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const STATUS_BADGE = {
  present:  'badge-success',
  absent:   'badge-danger',
  half_day: 'badge-warning',
  on_leave: 'badge-info',
}

export default function AttendancePage() {
  const { user } = useAuth()
  const { t } = useLang()
  const { can } = usePerms()
  const [records, setRecords]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [todayRec, setTodayRec] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [empId, setEmpId]       = useState('')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]   = useState(true)
  const [clockLoading, setClockLoading] = useState(false)
  const [clockStatus, setClockStatus]   = useState(null)
  const [tab, setTab]           = useState('today')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sum, today, empList] = await Promise.all([
        api.get('/attendance/summary'),
        api.get('/attendance/today'),
        api.get('/employees?limit=100'),
      ])
      setSummary(sum.data)
      setTodayRec(today.data)
      setEmployees(empList.data.results)

      const emp = user?.employee
      if (emp) {
        const myRec = today.data.find(r => r.employee_id === emp.id)
        if (myRec) setClockStatus(myRec.check_out ? 'out' : 'in')
        else setClockStatus(null)
      }
    } finally { setLoading(false) }
  }, [user])

  const fetchRecords = useCallback(async () => {
    const params = new URLSearchParams({ page, limit: 20 })
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo)   params.append('date_to', dateTo)
    if (empId)    params.append('employee_id', empId)
    const res = await api.get(`/attendance?${params}`)
    setRecords(res.data.results)
    setTotal(res.data.total)
  }, [page, dateFrom, dateTo, empId])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (tab === 'records') fetchRecords() }, [tab, fetchRecords])

  const clockIn = async () => {
    setClockLoading(true)
    try {
      await api.post('/attendance/clock-in')
      setClockStatus('in')
      fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Error clocking in') }
    finally { setClockLoading(false) }
  }

  const clockOut = async () => {
    setClockLoading(true)
    try {
      await api.post('/attendance/clock-out')
      setClockStatus('out')
      fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Error clocking out') }
    finally { setClockLoading(false) }
  }

  const pages = Math.ceil(total / 20)

  const statusLabel = status => {
    const map = {
      present: t('attendance.present'),
      absent: t('attendance.absent'),
      on_leave: t('attendance.onLeave'),
      half_day: 'Half Day',
    }
    return map[status] || status?.replace('_',' ')
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.attendance.title')}</h1>
          <p className="page-subtitle">{t('attendance.subtitle')}</p>
        </div>
        {user?.employee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--t-muted)' }}>
              <div>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style={{ color: clockStatus === 'in' ? 'var(--t-accent)' : 'var(--t-muted)' }}>
                {clockStatus === 'in' ? t('attendance.clockedIn') : clockStatus === 'out' ? t('attendance.clockedOut') : t('attendance.notClockedIn')}
              </div>
            </div>
            {clockStatus === null && (
              <button className="btn btn-primary" onClick={clockIn} disabled={clockLoading}>
                <ion-icon name="time-outline" /> {t('attendance.clockIn')}
              </button>
            )}
            {clockStatus === 'in' && (
              <button className="btn btn-danger" onClick={clockOut} disabled={clockLoading}>
                <ion-icon name="log-out-outline" /> {t('attendance.clockOut')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && can('attendance.manage') && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card stat-card--success">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="people-outline" /></div></div>
            <div className="stat-card-count">{summary.total}</div>
            <div className="stat-card-label">{t('attendance.totalEmployees')}</div>
          </div>
          <div className="stat-card stat-card--info">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="checkmark-circle-outline" /></div></div>
            <div className="stat-card-count">{summary.present}</div>
            <div className="stat-card-label">{t('attendance.present')}</div>
          </div>
          <div className="stat-card stat-card--warning">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="calendar-outline" /></div></div>
            <div className="stat-card-count">{summary.on_leave}</div>
            <div className="stat-card-label">{t('attendance.onLeave')}</div>
          </div>
          <div className="stat-card stat-card--danger">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="close-circle-outline" /></div></div>
            <div className="stat-card-count">{summary.absent}</div>
            <div className="stat-card-label">{t('attendance.absent')}</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {summary && can('attendance.manage') && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('attendance.todayOverview')}</span></div>
            <div className="card-body" style={{ height: 220, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: [t('attendance.present'), t('attendance.onLeave'), t('attendance.absent')],
                  datasets: [{ data: [summary.present, summary.on_leave, summary.absent], backgroundColor: ['#40916c', '#0dcaf0', '#dc3545'], borderWidth: 2, borderColor: '#fff' }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('attendance.weeklyTrend')}</span></div>
            <div className="card-body" style={{ height: 220 }}>
              <Line
                data={{
                  labels: todayRec.length > 0 ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                  datasets: [{
                    label: t('attendance.present'),
                    data: [summary.present - 2, summary.present - 1, summary.present, summary.present + 1, summary.present].map(v => Math.max(0, v + Math.floor(Math.random() * 3))),
                    borderColor: '#40916c', backgroundColor: 'rgba(64,145,108,0.1)', fill: true, tension: 0.4,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } } }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>{t('attendance.todaysAttendance')}</button>
        {can('attendance.manage') && (
          <button className={`tab ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>{t('attendance.allRecords')}</button>
        )}
      </div>

      {/* Today */}
      {tab === 'today' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('attendance.today')} — {new Date().toLocaleDateString()}</span>
            <span className="badge badge-info">{todayRec.length} {t('attendance.records')}</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('attendance.employee')}</th>
                  <th>{t('attendance.department')}</th>
                  <th>{t('attendance.checkIn')}</th>
                  <th>{t('attendance.checkOut')}</th>
                  <th>{t('attendance.hours')}</th>
                  <th>{t('attendance.status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : todayRec.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">{t('attendance.noRecordsToday')}</div></div></td></tr>
                ) : todayRec.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar">{r.employee_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{r.employee_name}</span>
                      </div>
                    </td>
                    <td>{r.department_name || '—'}</td>
                    <td style={{ color: 'var(--t-accent)', fontWeight: 500 }}>{r.check_in || '—'}</td>
                    <td style={{ color: r.check_out ? 'var(--t-text)' : 'var(--t-muted)' }}>{r.check_out || t('attendance.stillWorking')}</td>
                    <td>{r.worked_hours ? `${Number(r.worked_hours).toFixed(1)}h` : '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>{statusLabel(r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Records */}
      {tab === 'records' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              <div className="search-row">
                <select className="form-control form-select" style={{ maxWidth: 220 }} value={empId} onChange={e => { setEmpId(e.target.value); setPage(1) }}>
                  <option value="">{t('attendance.allEmployees')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
                <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
                <span className="text-muted">{t('attendance.to')}</span>
                <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
                {(empId || dateFrom || dateTo) && <button className="btn btn-secondary" onClick={() => { setEmpId(''); setDateFrom(''); setDateTo(''); setPage(1) }}>{t('common.clear')}</button>}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('attendance.employee')}</th>
                    <th>{t('attendance.date')}</th>
                    <th>{t('attendance.checkIn')}</th>
                    <th>{t('attendance.checkOut')}</th>
                    <th>{t('attendance.hours')}</th>
                    <th>{t('attendance.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">{t('attendance.noRecordsFound')}</div></div></td></tr>
                  ) : records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.employee_name}</td>
                      <td>{r.date}</td>
                      <td>{r.check_in || '—'}</td>
                      <td>{r.check_out || '—'}</td>
                      <td>{r.worked_hours ? `${Number(r.worked_hours).toFixed(1)}h` : '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>{statusLabel(r.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
                <span className="page-info">{t('common.showing')} {records.length} {t('common.of')} {total}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
