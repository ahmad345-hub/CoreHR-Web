import { useState, useEffect } from 'react'
import api from '../../api/client'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'

function TaskModal({ onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({ title: '', description: '', is_required: true })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/onboarding/tasks', form); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('onboarding.addOnboardingTask')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('onboarding.taskTitle')} *</label><input className="form-control" required value={form.title} onChange={e => f('title', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('onboarding.description')}</label><textarea className="form-control" rows={3} value={form.description} onChange={e => f('description', e.target.value)} /></div>
            <div className="form-group" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" id="req" checked={form.is_required} onChange={e => f('is_required', e.target.checked)} />
              <label htmlFor="req" className="form-label" style={{ margin:0 }}>{t('onboarding.requiredTask')}</label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('onboarding.addTask')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignModal({ employees, onSave, onClose }) {
  const { t } = useLang()
  const [empId, setEmpId] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post(`/onboarding/assign/${empId}`); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('onboarding.assignOnboarding')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('onboarding.employee')} *</label>
              <select className="form-control form-select" required value={empId} onChange={e => setEmpId(e.target.value)}>
                <option value="">{t('common.select')}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !empId}>{saving ? t('onboarding.assigning') : t('onboarding.assign')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const { t } = useLang()
  const { can } = usePerms()
  const [tab, setTab] = useState('records')
  const [tasks, setTasks] = useState([])
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => { api.get('/employees?limit=200').then(r => setEmployees(r.data.results)) }, [])

  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    setLoading(true)
    if (tab === 'tasks') api.get('/onboarding/tasks').then(r => setTasks(r.data)).finally(() => setLoading(false))
    if (tab === 'records') api.get('/onboarding/records').then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [tab, refreshKey])

  const deleteTask = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/onboarding/tasks/${id}`)
    setTasks(prev => prev.filter(x => x.id !== id))
  }

  const updateRecord = async (id, status) => {
    await api.put(`/onboarding/records/${id}`, { status })
    setRecords(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  const grouped = records.reduce((acc, r) => {
    const key = r.employee_name || `Employee ${r.employee_id}`
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.onboarding.title')}</h1>
          <p className="page-subtitle">{t('pages.onboarding.subtitle')}</p>
        </div>
        <div className="page-actions">
          {tab === 'tasks' && can('onboarding.manage') && <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><ion-icon name="add-outline" /> {t('onboarding.addTask')}</button>}
          {tab === 'records' && can('onboarding.manage') && <button className="btn btn-primary" onClick={() => setShowAssignModal(true)}><ion-icon name="person-add-outline" /> {t('onboarding.assignOnboarding')}</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>{t('onboarding.onboardingRecords')}</button>
        <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>{t('onboarding.taskTemplates')}</button>
      </div>

      {tab === 'records' && (
        loading
          ? <div className="card"><div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></div></div>
          : Object.keys(grouped).length === 0
            ? <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">{t('onboarding.noRecordsYet')}</div><p className="empty-state-desc">{t('onboarding.getStarted')}</p></div></div>
            : Object.entries(grouped).map(([emp, items]) => {
                const done = items.filter(i => i.status === 'completed').length
                const pct = Math.round((done / items.length) * 100)
                return (
                  <div className="card" key={emp} style={{ marginBottom: 16 }}>
                    <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div className="avatar">{emp[0]?.toUpperCase()}</div>
                        <div>
                          <div className="card-title" style={{ marginBottom:0 }}>{emp}</div>
                          <div className="text-muted" style={{ fontSize:12 }}>{done}/{items.length} {t('onboarding.tasksCompleted')}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:160 }}>
                        <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${pct}%` }} /></div>
                        <span className={`badge ${pct===100?'badge-success':'badge-info'}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead><tr><th>{t('onboarding.task')}</th><th>{t('onboarding.required')}</th><th>{t('onboarding.status')}</th><th>{t('onboarding.completed')}</th><th>{t('onboarding.action')}</th></tr></thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id}>
                              <td style={{ fontWeight:500 }}>{item.task_title || item.title}</td>
                              <td>{item.is_required ? <span className="badge badge-warning">{t('onboarding.requiredBadge')}</span> : <span className="badge badge-neutral">{t('onboarding.optionalBadge')}</span>}</td>
                              <td><span className={`badge ${item.status==='completed'?'badge-success':'badge-neutral'}`}>{item.status === 'completed' ? t('onboarding.completedStatus') : item.status}</span></td>
                              <td className="text-muted">{item.completed_at ? item.completed_at.slice(0,10) : '—'}</td>
                              <td>
                                {item.status !== 'completed' && can('onboarding.manage') && (
                                  <button className="btn btn-sm btn-success" onClick={() => updateRecord(item.id, 'completed')}>
                                    <ion-icon name="checkmark-outline" /> {t('onboarding.complete')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })
      )}

      {tab === 'tasks' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>{t('onboarding.number')}</th><th>{t('onboarding.title')}</th><th>{t('onboarding.description')}</th><th>{t('onboarding.required')}</th><th>{t('onboarding.actions')}</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">{t('onboarding.noTemplatesYet')}</div></div></td></tr>
                ) : tasks.map((task, i) => (
                  <tr key={task.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td style={{ fontWeight:500 }}>{task.title}</td>
                    <td className="text-muted">{task.description || '—'}</td>
                    <td>{task.is_required ? <span className="badge badge-warning">{t('onboarding.requiredBadge')}</span> : <span className="badge badge-neutral">{t('onboarding.optionalBadge')}</span>}</td>
                    <td>
                      {can('onboarding.manage') && <button className="btn btn-sm btn-danger" onClick={() => deleteTask(task.id)}>
                        <ion-icon name="trash-outline" />
                      </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTaskModal && <TaskModal onSave={() => { setShowTaskModal(false); reload() }} onClose={() => setShowTaskModal(false)} />}
      {showAssignModal && <AssignModal employees={employees} onSave={() => { setShowAssignModal(false); reload() }} onClose={() => setShowAssignModal(false)} />}
    </div>
  )
}
