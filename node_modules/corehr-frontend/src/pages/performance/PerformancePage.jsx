import { useState, useEffect } from 'react'
import api from '../../api/client'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'
import { useConfirm } from '../../components/ConfirmDialog'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const STARS = [1, 2, 3, 4, 5]

function GoalModal({ employees, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({ employee_id: '', title: '', description: '', target_date: '', progress: 0 })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/performance/goals', form); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('performance.addGoal')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('performance.employee')} *</label>
              <select className="form-control form-select" required value={form.employee_id} onChange={e => f('employee_id', e.target.value)}>
                <option value="">{t('common.select')}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{t('performance.goalTitle')} *</label><input className="form-control" required value={form.title} onChange={e => f('title', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('performance.description')}</label><textarea className="form-control" rows={3} value={form.description} onChange={e => f('description', e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('performance.targetDate')}</label><input type="date" className="form-control" value={form.target_date} onChange={e => f('target_date', e.target.value)} /></div>
              <div className="form-group">
                <label className="form-label">{t('performance.initialProgress')} {form.progress}%</label>
                <input type="range" min={0} max={100} step={5} value={form.progress} onChange={e => f('progress', +e.target.value)} style={{ width:'100%' }} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('performance.addGoal')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeedbackModal({ employees, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({ employee_id: '', rating: 5, comment: '', feedback_type: 'general' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/performance/feedback', { ...form, to_employee_id: form.employee_id, period: form.feedback_type }); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('performance.addFeedback')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('performance.employee')} *</label>
              <select className="form-control form-select" required value={form.employee_id} onChange={e => f('employee_id', e.target.value)}>
                <option value="">{t('common.select')}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('performance.type')}</label>
                <select className="form-control form-select" value={form.feedback_type} onChange={e => f('feedback_type', e.target.value)}>
                  <option value="general">{t('performance.general')}</option>
                  <option value="performance">{t('performance.performanceType')}</option>
                  <option value="peer">{t('performance.peerReview')}</option>
                  <option value="manager">{t('performance.manager')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('performance.rating')}</label>
                <div style={{ display:'flex', gap:4, marginTop:8 }}>
                  {STARS.map(s => (
                    <span key={s} onClick={() => f('rating', s)} style={{ cursor:'pointer', fontSize:24, color: s <= form.rating ? '#fbbf24' : '#d1d5db' }}>★</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group"><label className="form-label">{t('performance.comments')} *</label><textarea className="form-control" rows={4} required value={form.comment} onChange={e => f('comment', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('performance.submitFeedback')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const { t } = useLang()
  const { can } = usePerms()
  const [confirmDialog, confirm] = useConfirm()
  const [tab, setTab] = useState('goals')
  const [goals, setGoals] = useState([])
  const [feedback, setFeedback] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showFbModal, setShowFbModal] = useState(false)

  useEffect(() => { api.get('/employees?limit=200').then(r => setEmployees(r.data.results)) }, [])

  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    setLoading(true)
    if (tab === 'goals') api.get('/performance/goals').then(r => setGoals(r.data)).finally(() => setLoading(false))
    if (tab === 'feedback') api.get('/performance/feedback').then(r => setFeedback(r.data)).finally(() => setLoading(false))
  }, [tab, refreshKey])

  const updateProgress = async (id, progress) => {
    await api.put(`/performance/goals/${id}`, { progress })
    setGoals(g => g.map(x => x.id === id ? { ...x, progress } : x))
  }

  const deleteGoal = async id => {
    const ok = await confirm({
      title: t('common.confirm') || 'Delete goal',
      message: 'Are you sure you want to delete this goal? This action cannot be undone.',
      confirmText: t('common.delete') || 'Delete',
      cancelText: t('common.cancel') || 'Cancel',
      danger: true,
    })
    if (!ok) return
    await api.delete(`/performance/goals/${id}`)
    setGoals(g => g.filter(x => x.id !== id))
  }

  const Stars = ({ n }) => (
    <span>{STARS.map(s => <span key={s} style={{ color: s <= n ? '#fbbf24' : '#d1d5db', fontSize:16 }}>★</span>)}</span>
  )

  const statusLabel = progress => {
    if (progress >= 100) return { label: t('performance.statusCompleted'), cls: 'badge-success' }
    if (progress > 0)    return { label: t('performance.statusInProgress'), cls: 'badge-info' }
    return                      { label: t('performance.statusNotStarted'), cls: 'badge-neutral' }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.performance.title')}</h1>
          <p className="page-subtitle">{t('pages.performance.subtitle')}</p>
        </div>
        <div className="page-actions">
          {tab === 'goals' && can('performance.manage') && <button className="btn btn-primary" onClick={() => setShowGoalModal(true)}><ion-icon name="add-outline" /> {t('performance.addGoal')}</button>}
          {tab === 'feedback' && can('performance.manage') && <button className="btn btn-primary" onClick={() => setShowFbModal(true)}><ion-icon name="chatbubble-outline" /> {t('performance.addFeedback')}</button>}
        </div>
      </div>

      {/* Performance Charts */}
      {goals.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('performance.goalStatus')}</span></div>
            <div className="card-body" style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: [t('performance.active'), t('performance.completedGoals'), t('performance.cancelled')],
                  datasets: [{ data: [goals.filter(g=>g.status==='active').length, goals.filter(g=>g.status==='completed').length, goals.filter(g=>g.status==='cancelled').length], backgroundColor: ['#0dcaf0','#40916c','#dc3545'], borderWidth: 2, borderColor: '#fff' }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('performance.goalProgress')}</span></div>
            <div className="card-body" style={{ height: 200 }}>
              <Bar
                data={{
                  labels: goals.slice(0, 8).map(g => g.title?.slice(0, 15) + (g.title?.length > 15 ? '...' : '')),
                  datasets: [{ data: goals.slice(0, 8).map(g => g.progress), backgroundColor: goals.slice(0, 8).map(g => g.progress >= 80 ? '#40916c' : g.progress >= 50 ? '#f59e0b' : '#dc3545'), borderRadius: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } } }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'goals' ? 'active' : ''}`} onClick={() => setTab('goals')}>{t('performance.goals')}</button>
        <button className={`tab ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>{t('performance.feedback')}</button>
      </div>

      {tab === 'goals' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>{t('performance.employee')}</th><th>{t('performance.goal')}</th><th>{t('performance.progress')}</th><th>{t('performance.targetDate')}</th><th>{t('performance.status')}</th><th>{t('performance.actions')}</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                ) : goals.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🎯</div><div className="empty-state-title">{t('performance.noGoalsYet')}</div></div></td></tr>
                ) : goals.map(g => {
                  const { label, cls } = statusLabel(g.progress || 0)
                  return (
                    <tr key={g.id}>
                      <td style={{ fontWeight:500 }}>{g.employee_name}</td>
                      <td>
                        <div style={{ fontWeight:500 }}>{g.title}</div>
                        {g.description && <div className="text-muted" style={{ fontSize:12 }}>{g.description}</div>}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:140 }}>
                          <div className="progress" style={{ flex:1 }}>
                            <div className="progress-bar" style={{ width:`${g.progress||0}%` }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, minWidth:32 }}>{g.progress||0}%</span>
                        </div>
                      </td>
                      <td className="text-muted">{g.target_date || '—'}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td>
                        <div className="table-actions">
                          {g.progress < 100 && (
                            <>
                              <button className="btn btn-sm btn-secondary" onClick={() => updateProgress(g.id, Math.min(100, (g.progress||0)+25))}>+25%</button>
                              <button className="btn btn-sm btn-success" onClick={() => updateProgress(g.id, 100)}>{t('performance.done')}</button>
                            </>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => deleteGoal(g.id)}><ion-icon name="trash-outline" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>{t('performance.employee')}</th><th>{t('performance.reviewer')}</th><th>{t('performance.type')}</th><th>{t('performance.rating')}</th><th>{t('performance.comment')}</th><th>{t('performance.date')}</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                ) : feedback.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">💬</div><div className="empty-state-title">{t('performance.noFeedbackYet')}</div></div></td></tr>
                ) : feedback.map(fb => (
                  <tr key={fb.id}>
                    <td style={{ fontWeight:500 }}>{fb.to_name}</td>
                    <td className="text-muted">{fb.from_name || '—'}</td>
                    <td><span className="badge badge-info" style={{ textTransform:'capitalize' }}>{fb.period}</span></td>
                    <td><Stars n={fb.rating} /></td>
                    <td style={{ maxWidth:260 }}><div className="text-muted" style={{ fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{fb.comment}</div></td>
                    <td className="text-muted">{fb.created_at?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGoalModal && <GoalModal employees={employees} onSave={() => { setShowGoalModal(false); reload() }} onClose={() => setShowGoalModal(false)} />}
      {showFbModal && <FeedbackModal employees={employees} onSave={() => { setShowFbModal(false); reload() }} onClose={() => setShowFbModal(false)} />}
      {confirmDialog}
    </div>
  )
}
