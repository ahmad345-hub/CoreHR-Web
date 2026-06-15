import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import api from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const STATUS_BADGE = { approved: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger', cancelled: 'badge-neutral' }

function LeaveTypeModal({ initial = null, onSave, onClose }) {
  const { t } = useLang()
  const editing = !!initial
  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    total_days:  initial?.total_days  ?? '',
    carryforward: initial?.carryforward ? '1' : '0',
    paid:        initial?.paid        ? '1' : '0',
  })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await onSave({ ...form, carryforward: form.carryforward === '1', paid: form.paid === '1' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">{editing ? t('leave.editLeaveType') : t('leave.addLeaveType')}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">{t('leave.leaveTypeName')} *</label>
              <input className="form-control" required value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Annual Leave" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('leave.totalDays')} *</label>
              <input type="number" className="form-control" required min="0" step="0.5" value={form.total_days} onChange={e => f('total_days', e.target.value)} placeholder="e.g. 20" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('leave.carryForward')}</label>
                <select className="form-control form-select" value={form.carryforward} onChange={e => f('carryforward', e.target.value)}>
                  <option value="0">{t('leave.no')}</option>
                  <option value="1">{t('leave.yes')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('leave.type')}</label>
                <select className="form-control form-select" value={form.paid} onChange={e => f('paid', e.target.value)}>
                  <option value="1">{t('leave.paid')}</option>
                  <option value="0">{t('leave.unpaid')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RequestModal({ employees, leaveTypes, onSave, onClose }) {
  const { user } = useAuth()
  const { t } = useLang()
  const { can } = usePerms()
  const [form, setForm] = useState({ employee_id: user?.employee?.id || '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const days = form.start_date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1)
    : 0

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/leave/requests', { ...form, days })
      onSave()
    } catch (err) { setError(err.response?.data?.error || t('leave.errorSubmitting')) }
    finally { setSaving(false) }
  }
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('leave.newLeaveRequest')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            {can('leave.manage_types') && (
              <div className="form-group"><label className="form-label">{t('leave.employee')}</label>
                <select className="form-control form-select" value={form.employee_id} onChange={e => f('employee_id', e.target.value)} required>
                  <option value="">{t('common.select')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group"><label className="form-label">{t('leave.leaveType')} *</label>
              <select className="form-control form-select" value={form.leave_type_id} onChange={e => f('leave_type_id', e.target.value)} required>
                <option value="">{t('common.select')}</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.total_days} {t('leave.days')})</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('leave.startDate')} *</label><input type="date" className="form-control" required value={form.start_date} onChange={e => f('start_date', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('leave.endDate')} *</label><input type="date" className="form-control" required value={form.end_date} onChange={e => f('end_date', e.target.value)} /></div>
            </div>
            {days > 0 && <div className="alert alert-info" style={{ marginBottom: 12 }}>{t('leave.duration')} <strong>{days} {days > 1 ? t('leave.daysPlural') : t('leave.day')}</strong></div>}
            {/* AI Smart Suggestion */}
            {form.start_date && (() => {
              const start = new Date(form.start_date)
              const day = start.getDay()
              const suggestions = []
              if (day === 1 && days <= 3) suggestions.push({ icon: 'bulb', text: t('leave.tipMonday') || 'Tip: Starting on Monday gives you a long weekend with Saturday & Sunday!' })
              if (day === 4 && days === 1) suggestions.push({ icon: 'bulb', text: t('leave.tipThursday') || 'Tip: Take Friday off instead for a 3-day weekend!' })
              if (days > 5) suggestions.push({ icon: 'information-circle', text: t('leave.tipLong') || 'Long leave detected. Consider splitting into smaller periods for better team coverage.' })
              if (day === 6 || day === 0) suggestions.push({ icon: 'alert-circle', text: t('leave.tipWeekend') || 'Your leave starts on a weekend. Consider starting on a workday.' })
              return suggestions.length > 0 ? (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#d97706', fontWeight: 600, fontSize: 12 }}>
                    <ion-icon name="sparkles" /> AI Suggestion
                  </div>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: 'var(--t-text-muted)', marginTop: i > 0 ? 4 : 0 }}>
                      <ion-icon name={s.icon + '-outline'} style={{ marginTop: 2, flexShrink: 0 }} /> {s.text}
                    </div>
                  ))}
                </div>
              ) : null
            })()}
            <div className="form-group"><label className="form-label">{t('leave.reason')}</label><textarea className="form-control" rows={3} value={form.reason} onChange={e => f('reason', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('leave.submitting') : t('leave.submitRequest')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const { user } = useAuth()
  const { t } = useLang()
  const { can } = usePerms()
  const [tab, setTab]           = useState('requests')
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employees, setEmployees]   = useState([])
  const [allocations, setAllocations] = useState([])
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [total, setTotal]       = useState(0)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [typeModal, setTypeModal]       = useState(null)

  const fetchLeaveTypes = useCallback(async () => {
    const res = await api.get('/leave/types')
    setLeaveTypes(res.data)
  }, [])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (filterStatus) params.append('status', filterStatus)
      const res = await api.get(`/leave/requests?${params}`)
      setRequests(res.data.results)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } finally { setLoading(false) }
  }, [page, filterStatus])

  useEffect(() => {
    fetchLeaveTypes()
    api.get('/employees?limit=100').then(res => setEmployees(res.data.results))
  }, [fetchLeaveTypes])

  useEffect(() => {
    if (tab === 'allocations') {
      api.get('/leave/allocations').then(res => setAllocations(res.data))
    }
  }, [tab])

  useEffect(() => { if (tab === 'requests') fetchRequests() }, [tab, fetchRequests])

  const approve = async id => {
    await api.put(`/leave/requests/${id}/approve`)
    fetchRequests()
  }
  const reject = async id => {
    await api.put(`/leave/requests/${id}/reject`)
    fetchRequests()
  }

  const statusLabel = s => {
    const map = { pending: t('leave.pending'), approved: t('leave.approved'), rejected: t('leave.rejected'), cancelled: t('leave.cancelled') }
    return map[s] || s
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.leave.title')}</h1>
          <p className="page-subtitle">{t('pages.leave.subtitle')}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <ion-icon name="add-outline" /> {t('leave.newRequest')}
          </button>
        </div>
      </div>

      {/* Leave Summary Charts */}
      {can('leave.approve') && requests.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('leave.requestStatus')}</span></div>
            <div className="card-body" style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: [t('leave.approved'), t('leave.pending'), t('leave.rejected')],
                  datasets: [{ data: [requests.filter(r=>r.status==='approved').length, requests.filter(r=>r.status==='pending').length, requests.filter(r=>r.status==='rejected').length], backgroundColor: ['#40916c','#f59e0b','#dc3545'], borderWidth: 2, borderColor: '#fff' }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('leave.byType')}</span></div>
            <div className="card-body" style={{ height: 200 }}>
              {(() => {
                const types = {}; requests.filter(r=>r.status==='approved').forEach(r => { types[r.leave_type_name || 'Other'] = (types[r.leave_type_name || 'Other'] || 0) + (r.days || 1) })
                return <Bar data={{ labels: Object.keys(types), datasets: [{ data: Object.values(types), backgroundColor: ['#40916c','#52b788','#74c69d','#0dcaf0','#6f42c1'], borderRadius: 6 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } } }} />
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>{t('leave.leaveRequests')}</button>
        {can('leave.manage_types') && (
          <button className={`tab ${tab === 'allocations' ? 'active' : ''}`} onClick={() => setTab('allocations')}>{t('leave.allocations')}</button>
        )}
        {can('leave.manage_types') && (
          <button className={`tab ${tab === 'types' ? 'active' : ''}`} onClick={() => setTab('types')}>{t('leave.leaveTypes')}</button>
        )}
      </div>

      {/* Requests */}
      {tab === 'requests' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              <div className="search-row">
                <select className="form-control form-select" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                  <option value="">{t('leave.allStatus')}</option>
                  <option value="pending">{t('leave.pending')}</option>
                  <option value="approved">{t('leave.approved')}</option>
                  <option value="rejected">{t('leave.rejected')}</option>
                  <option value="cancelled">{t('leave.cancelled')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>{t('leave.employee')}</th>
                  <th>{t('leave.department')}</th>
                  <th>{t('leave.leaveType')}</th>
                  <th>{t('leave.from')}</th>
                  <th>{t('leave.to')}</th>
                  <th>{t('leave.days')}</th>
                  <th>{t('leave.status')}</th>
                  <th>{t('leave.actions')}</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding: 40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🏖️</div><div className="empty-state-title">{t('leave.noRequestsFound')}</div></div></td></tr>
                  ) : requests.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.employee_name}</td>
                      <td className="text-muted">{r.department_name || '—'}</td>
                      <td>{r.leave_type_name}</td>
                      <td>{r.start_date}</td>
                      <td>{r.end_date}</td>
                      <td><span className="badge badge-info">{r.days}d</span></td>
                      <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>{statusLabel(r.status)}</span></td>
                      <td>
                        {r.status === 'pending' && can('leave.approve') && (
                          <div className="table-actions">
                            <button className="btn btn-sm btn-success" onClick={() => approve(r.id)} title={t('leave.approved')}><ion-icon name="checkmark-outline" /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => reject(r.id)} title={t('leave.rejected')}><ion-icon name="close-outline" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
                {Array.from({length: pages}, (_,i)=>i+1).map(p => <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={() => setPage(p)}>{p}</button>)}
                <button className="page-btn" disabled={page===pages} onClick={() => setPage(p=>p+1)}>›</button>
                <span className="page-info">{total} {t('common.of')}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Allocations */}
      {tab === 'allocations' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('leave.employee')}</th>
                <th>{t('leave.leaveType')}</th>
                <th>{t('leave.totalDays')}</th>
                <th>{t('leave.usedDays')}</th>
                <th>{t('leave.remaining')}</th>
                <th>{t('leave.year')}</th>
              </tr></thead>
              <tbody>
                {allocations.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.employee_name}</td>
                    <td>{a.leave_type_name}</td>
                    <td>{a.total_days}</td>
                    <td>{a.used_days}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 80 }}>
                          <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(100, (a.used_days/a.total_days)*100)}%` }} /></div>
                        </div>
                        <span className={`badge ${(a.total_days - a.used_days) > 5 ? 'badge-success' : 'badge-warning'}`}>{a.total_days - a.used_days}d</span>
                      </div>
                    </td>
                    <td>{a.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Types */}
      {tab === 'types' && (
        <div className="card">
          <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ion-icon name="calendar-outline" style={{ fontSize:18, color:'var(--t-accent)' }} />
              <span className="card-title">{t('leave.leaveTypes')}</span>
              <span className="badge badge-info">{leaveTypes.length}</span>
            </div>
            {can('leave.manage_types') && (
              <button className="btn btn-primary btn-sm" onClick={() => setTypeModal({ initial: null })}>
                <ion-icon name="add-outline" /> {t('leave.addLeaveType')}
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('leave.leaveType')}</th>
                <th>{t('leave.totalDays')}</th>
                <th>{t('leave.carryForward')}</th>
                <th>{t('leave.paid')}</th>
                {can('leave.manage_types') && <th>{t('leave.actions')}</th>}
              </tr></thead>
              <tbody>
                {leaveTypes.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state" style={{ padding:24 }}><div className="empty-state-title">{t('leave.noLeaveTypesYet')}</div></div></td></tr>
                ) : leaveTypes.map(lt => (
                  <tr key={lt.id}>
                    <td style={{ fontWeight: 500 }}>{lt.name}</td>
                    <td>{lt.total_days}</td>
                    <td><span className={`badge ${lt.carryforward ? 'badge-success' : 'badge-neutral'}`}>{lt.carryforward ? t('leave.yes') : t('leave.no')}</span></td>
                    <td><span className={`badge ${lt.paid ? 'badge-success' : 'badge-danger'}`}>{lt.paid ? t('leave.paid') : t('leave.unpaid')}</span></td>
                    {can('leave.manage_types') && (
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-sm btn-secondary" title={t('common.edit')} onClick={() => setTypeModal({ initial: lt })}>
                            <ion-icon name="pencil-outline" />
                          </button>
                          <button className="btn btn-sm btn-danger" title={t('common.delete')} onClick={async () => {
                            if (!confirm(`${t('common.confirm')} "${lt.name}"?`)) return
                            await api.delete(`/leave/types/${lt.id}`)
                            fetchLeaveTypes()
                          }}>
                            <ion-icon name="trash-outline" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <RequestModal
          employees={employees} leaveTypes={leaveTypes}
          onSave={() => { setShowModal(false); fetchRequests() }}
          onClose={() => setShowModal(false)}
        />
      )}

      {typeModal && (
        <LeaveTypeModal
          initial={typeModal.initial}
          onSave={async (form) => {
            if (typeModal.initial) {
              await api.put(`/leave/types/${typeModal.initial.id}`, form)
            } else {
              await api.post('/leave/types', form)
            }
            setTypeModal(null)
            fetchLeaveTypes()
          }}
          onClose={() => setTypeModal(null)}
        />
      )}
    </div>
  )
}
