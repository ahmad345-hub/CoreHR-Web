import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'
import { usePerms } from '../../hooks/usePerms'
import { useAuth } from '../../context/AuthContext'

const STATUS_BADGE    = { planning:'badge-neutral', active:'badge-info', on_hold:'badge-warning', completed:'badge-success', cancelled:'badge-danger' }
const PRIORITY_BADGE  = { low:'badge-neutral', medium:'badge-warning', high:'badge-danger' }
const TASK_STATUS_BADGE = { todo:'badge-neutral', in_progress:'badge-info', done:'badge-success', cancelled:'badge-danger' }

function ProjectModal({ project, onSave, onClose }) {
  const { t } = useLang()
  const isEdit = !!project
  const [form, setForm] = useState(project
    ? { name: project.name || '', description: project.description || '', status: project.status || 'active', start_date: project.start_date || '', end_date: project.end_date || '' }
    : { name: '', description: '', status: 'active', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (isEdit) await api.put(`/projects/${project.id}`, form)
      else await api.post('/projects', form)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{isEdit ? t('projects.editProject') : t('projects.newProject')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('projects.projectName')} *</label><input className="form-control" required value={form.name} onChange={e => f('name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('projects.description')}</label><textarea className="form-control" rows={3} value={form.description} onChange={e => f('description', e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('projects.status')}</label>
                <select className="form-control form-select" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="active">{t('projects.active')}</option>
                  <option value="on_hold">{t('projects.onHold')}</option>
                  <option value="completed">{t('projects.completed')}</option>
                  <option value="cancelled">{t('projects.cancelled')}</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('projects.startDate')}</label><input type="date" className="form-control" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('projects.endDate')}</label><input type="date" className="form-control" value={form.end_date} onChange={e => f('end_date', e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : (isEdit ? t('common.save') : t('projects.createProject'))}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskModal({ task, projects, employees, onSave, onClose }) {
  const { t } = useLang()
  const isEdit = !!task
  const [form, setForm] = useState(task
    ? { project_id: task.project_id || '', title: task.title || '', description: task.description || '', priority: task.priority || 'medium', due_date: task.due_date || '', status: task.status || 'todo', assigned_to: task.assigned_to || '' }
    : { project_id: '', title: '', description: '', priority: 'medium', due_date: '', status: 'todo', assigned_to: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (isEdit) await api.put(`/projects/tasks/${task.id}`, form)
      else await api.post(`/projects/${form.project_id}/tasks`, form)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{isEdit ? t('projects.editTask') : t('projects.addTask')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('projects.projectSelect')} *</label>
              <select className="form-control form-select" required value={form.project_id} onChange={e => f('project_id', e.target.value)} disabled={isEdit}>
                <option value="">{t('common.select')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{t('projects.taskTitle')} *</label><input className="form-control" required value={form.title} onChange={e => f('title', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('projects.description')}</label><textarea className="form-control" rows={2} value={form.description} onChange={e => f('description', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Assigned To</label>
              <select className="form-control form-select" value={form.assigned_to} onChange={e => f('assigned_to', e.target.value)}>
                <option value="">— Unassigned —</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}{emp.department_name ? ` · ${emp.department_name}` : ''}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('projects.priority')}</label>
                <select className="form-control form-select" value={form.priority} onChange={e => f('priority', e.target.value)}>
                  <option value="low">{t('projects.low')}</option>
                  <option value="medium">{t('projects.medium')}</option>
                  <option value="high">{t('projects.high')}</option>
                  <option value="urgent">{t('projects.urgent')}</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t('projects.status')}</label>
                <select className="form-control form-select" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">{t('projects.dueDate')}</label><input type="date" className="form-control" value={form.due_date} onChange={e => f('due_date', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : (isEdit ? t('common.save') : t('projects.addTask'))}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TimesheetModal({ timesheet, projects, onSave, onClose }) {
  const { t } = useLang()
  const isEdit = !!timesheet
  const [form, setForm] = useState(timesheet
    ? { project_id: timesheet.project_id || '', task_id: timesheet.task_id || '', date: timesheet.date || '', hours: timesheet.hours || '', description: timesheet.description || '' }
    : { project_id: '', task_id: '', date: new Date().toISOString().slice(0,10), hours: '', description: '' })
  const [tasks, setTasks] = useState([])
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (form.project_id) api.get(`/projects/${form.project_id}/tasks`).then(r => setTasks(r.data))
    else setTasks([])
  }, [form.project_id])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (isEdit) await api.put(`/projects/timesheets/${timesheet.id}`, form)
      else await api.post('/projects/timesheets', form)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{isEdit ? t('projects.editTimeLog') : t('projects.logTimeModal')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            {!isEdit && (
              <div className="form-group"><label className="form-label">{t('projects.projectSelect')} *</label>
                <select className="form-control form-select" required value={form.project_id} onChange={e => f('project_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {tasks.length > 0 && !isEdit && (
              <div className="form-group"><label className="form-label">{t('projects.task')}</label>
                <select className="form-control form-select" value={form.task_id} onChange={e => f('task_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {tasks.map(tk => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('projects.date')} *</label><input type="date" className="form-control" required value={form.date} onChange={e => f('date', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('projects.hours')} *</label><input type="number" step="0.5" min="0.5" max="24" className="form-control" required value={form.hours} onChange={e => f('hours', e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">{t('projects.description')}</label><textarea className="form-control" rows={2} value={form.description} onChange={e => f('description', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : (isEdit ? t('common.save') : t('projects.logTime'))}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { t } = useLang()
  const { can } = usePerms()
  const { user } = useAuth()
  const myEmpId = user?.employee?.id
  const [tab, setTab] = useState('projects')
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [employees, setEmployees] = useState([])
  const [selProject, setSelProject] = useState('')
  const [loading, setLoading] = useState(true)
  const [showProjModal, setShowProjModal] = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [showTsModal, setShowTsModal] = useState(false)
  const [editTs, setEditTs] = useState(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/projects'); setProjects(r.data.results || r.data) }
    finally { setLoading(false) }
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const url = selProject ? `/projects/${selProject}/tasks` : '/projects/all-tasks'
      const r = await api.get(url)
      setTasks(r.data)
    } finally { setLoading(false) }
  }, [selProject])

  useEffect(() => { if (tab === 'projects') fetchProjects() }, [tab, fetchProjects])
  useEffect(() => { if (tab === 'tasks') fetchTasks() }, [tab, fetchTasks])
  useEffect(() => { api.get('/employees?limit=200').then(r => setEmployees(r.data.results || [])).catch(() => {}) }, [])
  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    if (tab === 'timesheets') {
      setLoading(true)
      api.get('/projects/timesheets').then(r => setTimesheets(r.data)).finally(() => setLoading(false))
    }
  }, [tab, refreshKey])

  const deleteProject = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/projects/${id}`)
    fetchProjects()
  }

  const deleteTask = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/projects/tasks/${id}`)
    fetchTasks()
  }

  const deleteTimesheet = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/projects/timesheets/${id}`)
    reload()
  }

  const priorityLabel = p => {
    const map = { low: t('projects.low'), medium: t('projects.medium'), high: t('projects.high'), urgent: t('projects.urgent') }
    return map[p] || p
  }

  const statusLabel = s => {
    const map = { active: t('projects.active'), on_hold: t('projects.onHold'), completed: t('projects.completed'), cancelled: t('projects.cancelled'), todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' }
    return map[s] || s?.replace('_',' ')
  }

  const closeProj = () => { setShowProjModal(false); setEditProject(null) }
  const closeTask = () => { setShowTaskModal(false); setEditTask(null) }
  const closeTs = () => { setShowTsModal(false); setEditTs(null) }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.projects.title')}</h1>
          <p className="page-subtitle">{t('projects.subtitle')}</p>
        </div>
        <div className="page-actions">
          {tab === 'projects' && can('projects.manage') && <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowProjModal(true) }}><ion-icon name="add-outline" /> {t('projects.newProject')}</button>}
          {tab === 'tasks' && can('projects.manage') && <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowTaskModal(true) }}><ion-icon name="add-outline" /> {t('projects.addTask')}</button>}
          {tab === 'timesheets' && can('projects.view') && <button className="btn btn-primary" onClick={() => { setEditTs(null); setShowTsModal(true) }}><ion-icon name="time-outline" /> {t('projects.logTime')}</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>{t('projects.projectsTab')}</button>
        <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>{t('projects.tasksTab')}</button>
        <button className={`tab ${tab === 'timesheets' ? 'active' : ''}`} onClick={() => setTab('timesheets')}>{t('projects.timesheetsTab')}</button>
      </div>

      {/* Projects */}
      {tab === 'projects' && (
        loading ? <div className="card"><div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></div></div>
        : projects.length === 0
          ? <div className="card"><div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-title">{t('projects.noProjectsYet')}</div></div></div>
          : <div className="grid-3" style={{ alignItems:'start' }}>
              {projects.map(p => {
                const total = p.task_count || 0
                const done = p.completed_tasks || 0
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div className="card" key={p.id}>
                    <div className="card-body" style={{ padding:20 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div>
                        <span className={`badge ${STATUS_BADGE[p.status] || 'badge-neutral'}`}>{statusLabel(p.status)}</span>
                      </div>
                      {p.description && <div className="text-muted" style={{ fontSize:13, marginBottom:12 }}>{p.description}</div>}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${pct}%` }} /></div>
                        <span style={{ fontSize:12, fontWeight:600 }}>{pct}%</span>
                      </div>
                      <div className="text-muted" style={{ fontSize:12, marginBottom:12 }}>
                        {done}/{total} {t('projects.tasks')} &nbsp;·&nbsp;
                        {p.start_date && <span>{p.start_date}</span>}
                        {p.end_date && <span> – {p.end_date}</span>}
                      </div>
                      {can('projects.manage') && (
                        <div className="table-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditProject(p); setShowProjModal(true) }}><ion-icon name="create-outline" /> {t('common.edit')}</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteProject(p.id)}><ion-icon name="trash-outline" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      {/* Tasks */}
      {tab === 'tasks' && (
        <>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body" style={{ padding:'12px 20px' }}>
              <div className="search-row">
                <select className="form-control form-select" style={{ maxWidth:240 }} value={selProject} onChange={e => setSelProject(e.target.value)}>
                  <option value="">{t('projects.allProjects')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>{t('projects.task')}</th>
                  <th>{t('projects.project')}</th>
                  <th>Assigned To</th>
                  <th>{t('projects.priority')}</th>
                  <th>{t('projects.status')}</th>
                  <th>{t('projects.dueDate')}</th>
                  <th>{t('projects.actions')}</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                  ) : tasks.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">{selProject ? t('projects.noTasksInProject') : t('projects.noTasks')}</div></div></td></tr>
                  ) : tasks.map(tk => (
                    <tr key={tk.id}>
                      <td>
                        <div style={{ fontWeight:500 }}>{tk.title}</div>
                        {tk.description && <div className="text-muted" style={{ fontSize:12 }}>{tk.description}</div>}
                      </td>
                      <td className="text-muted">{tk.project_name || '—'}</td>
                      <td className="text-muted">{tk.assigned_to_name || '—'}</td>
                      <td><span className={`badge ${PRIORITY_BADGE[tk.priority] || 'badge-neutral'}`}>{priorityLabel(tk.priority)}</span></td>
                      <td><span className={`badge ${TASK_STATUS_BADGE[tk.status] || 'badge-neutral'}`}>{statusLabel(tk.status)}</span></td>
                      <td className="text-muted">{tk.due_date || '—'}</td>
                      <td>
                        <div className="table-actions">
                          {can('projects.manage') && <button className="btn btn-sm btn-secondary" onClick={() => { setEditTask(tk); setShowTaskModal(true) }}><ion-icon name="create-outline" /></button>}
                          {can('projects.manage') && <button className="btn btn-sm btn-danger" onClick={() => deleteTask(tk.id)}><ion-icon name="trash-outline" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Timesheets */}
      {tab === 'timesheets' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('projects.employee')}</th>
                <th>{t('projects.project')}</th>
                <th>{t('projects.task')}</th>
                <th>{t('projects.date')}</th>
                <th>{t('projects.hours')}</th>
                <th>{t('projects.description')}</th>
                <th>{t('projects.actions')}</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                ) : timesheets.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">⏱️</div><div className="empty-state-title">{t('projects.noTimeLogs')}</div></div></td></tr>
                ) : timesheets.map(ts => (
                  <tr key={ts.id}>
                    <td style={{ fontWeight:500 }}>{ts.employee_name}</td>
                    <td className="text-muted">{ts.project_name || '—'}</td>
                    <td className="text-muted">{ts.task_title || '—'}</td>
                    <td className="text-muted">{ts.date}</td>
                    <td><span className="badge badge-info">{ts.hours}h</span></td>
                    <td className="text-muted">{ts.description || '—'}</td>
                    <td>
                      <div className="table-actions">
                        {(can('projects.manage') || ts.employee_id === myEmpId) && <button className="btn btn-sm btn-secondary" onClick={() => { setEditTs(ts); setShowTsModal(true) }}><ion-icon name="create-outline" /></button>}
                        {(can('projects.manage') || ts.employee_id === myEmpId) && <button className="btn btn-sm btn-danger" onClick={() => deleteTimesheet(ts.id)}><ion-icon name="trash-outline" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showProjModal && <ProjectModal project={editProject} onSave={() => { closeProj(); fetchProjects() }} onClose={closeProj} />}
      {showTaskModal && <TaskModal task={editTask} projects={projects} employees={employees} onSave={() => { closeTask(); fetchTasks() }} onClose={closeTask} />}
      {showTsModal && <TimesheetModal timesheet={editTs} projects={projects} onSave={() => { closeTs(); reload() }} onClose={closeTs} />}
    </div>
  )
}
