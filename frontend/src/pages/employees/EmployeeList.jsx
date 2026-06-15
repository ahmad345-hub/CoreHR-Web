import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'

const GENDERS  = ['male', 'female', 'other']
const STATUSES = ['active', 'inactive']

function ResetPasswordModal({ emp, onClose }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    setSaving(true)
    try {
      await api.put(`/employees/${emp.id}/reset-password`, { new_password: password })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Reset Password — {emp.first_name} {emp.last_name}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {success ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 500 }}>Password reset successfully!</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-control" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Reset Password'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function EmployeeModal({ emp, departments, positions, workTypes, shifts, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState(emp ? {
    first_name: emp.first_name, last_name: emp.last_name, email: emp.email,
    username: emp.username, badge_id: emp.badge_id,
    department_id: emp.department_id, job_position_id: emp.job_position_id,
    work_type_id: emp.work_type_id, shift_id: emp.shift_id,
    date_joining: emp.date_joining?.slice(0,10), salary: emp.salary,
    phone: emp.phone, gender: emp.gender, dob: emp.dob?.slice(0,10),
    address: emp.address, city: emp.city, country: emp.country,
    is_active: emp.is_active,
  } : {
    first_name: '', last_name: '', email: '', username: '', password: '', badge_id: '',
    department_id: '', job_position_id: '', work_type_id: '', shift_id: '',
    date_joining: '', salary: '', phone: '', gender: 'male', dob: '',
    address: '', city: '', country: 'US', is_active: 1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const save = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (emp) { await api.put(`/employees/${emp.id}`, form) }
      else      { await api.post('/employees', form) }
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || t('employees.errorSaving'))
    } finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <span className="modal-title">{emp ? t('employees.editEmployee') : t('employees.addNew')}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--t-dark)', marginBottom: 12 }}>{t('employees.personalInfo')}</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.firstName')} *</label><input className="form-control" required value={form.first_name} onChange={e => f('first_name', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('employees.lastName')} *</label><input className="form-control" required value={form.last_name} onChange={e => f('last_name', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.email')} *</label><input type="email" className="form-control" required value={form.email} onChange={e => f('email', e.target.value)} /></div>
              {!emp
                ? <div className="form-group"><label className="form-label">{t('employees.username')} *</label><input className="form-control" required value={form.username} onChange={e => f('username', e.target.value)} /></div>
                : <div className="form-group"><label className="form-label">{t('employees.username')}</label><input className="form-control" value={form.username || ''} readOnly style={{ background: 'var(--bg-secondary)', cursor: 'default' }} /></div>
              }
            </div>
            {!emp && (
              <div className="form-row">
                <div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-control" required value={form.password} onChange={e => f('password', e.target.value)} placeholder="Enter password for this employee" /></div>
              </div>
            )}
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.badgeId')}</label><input className="form-control" value={form.badge_id} onChange={e => f('badge_id', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('employees.gender')}</label>
                <select className="form-control form-select" value={form.gender} onChange={e => f('gender', e.target.value)}>
                  {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.dob')}</label><input type="date" className="form-control" value={form.dob} onChange={e => f('dob', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('employees.phone')}</label><input className="form-control" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
            </div>

            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--t-dark)', margin: '16px 0 12px' }}>{t('employees.workInfo')}</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.department')}</label>
                <select className="form-control form-select" value={form.department_id} onChange={e => f('department_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t('employees.jobPosition')}</label>
                <select className="form-control form-select" value={form.job_position_id} onChange={e => f('job_position_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.workType')}</label>
                <select className="form-control form-select" value={form.work_type_id} onChange={e => f('work_type_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {workTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t('employees.shift')}</label>
                <select className="form-control form-select" value={form.shift_id} onChange={e => f('shift_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.dateJoining')}</label><input type="date" className="form-control" value={form.date_joining} onChange={e => f('date_joining', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('employees.salaryYear')}</label><input type="number" className="form-control" value={form.salary} onChange={e => f('salary', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('employees.city')}</label><input className="form-control" value={form.city} onChange={e => f('city', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('employees.country')}</label><input className="form-control" value={form.country} onChange={e => f('country', e.target.value)} /></div>
            </div>
            {emp && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem' }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={e => f('is_active', e.target.checked ? 1 : 0)} />
                  {t('employees.activeEmployee')}
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('common.saving') : emp ? t('employees.updateEmployee') : t('employees.addEmployee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EmployeeList() {
  const { user } = useAuth()
  const { t } = useLang()
  const { can } = usePerms()
  const [employees, setEmployees] = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [search, setSearch]       = useState('')
  const [dept, setDept]           = useState('')
  const [status, setStatus]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [resetEmp, setResetEmp]   = useState(null)

  const [departments, setDepartments] = useState([])
  const [positions, setPositions]     = useState([])
  const [workTypes, setWorkTypes]     = useState([])
  const [shifts, setShifts]           = useState([])

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (search) params.append('search', search)
      if (dept)   params.append('department', dept)
      if (status) params.append('status', status)
      const res = await api.get(`/employees?${params}`)
      setEmployees(res.data.results)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } finally { setLoading(false) }
  }, [page, search, dept, status])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  useEffect(() => {
    Promise.all([
      api.get('/settings/departments'),
      api.get('/settings/job-positions'),
      api.get('/settings/work-types'),
      api.get('/settings/shifts'),
    ]).then(([d, p, w, s]) => {
      setDepartments(d.data); setPositions(p.data); setWorkTypes(w.data); setShifts(s.data)
    })
  }, [])

  const deleteEmployee = async id => {
    if (!window.confirm(t('employees.deleteConfirm'))) return
    await api.delete(`/employees/${id}`)
    fetchEmployees()
  }

  const initials = emp => {
    const f = emp.first_name?.[0] || ''
    const l = emp.last_name?.[0] || ''
    return (f + l).toUpperCase()
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.employees.title')}</h1>
          <p className="page-subtitle">{total} {t('employees.totalEmployees')}</p>
        </div>
        <div className="page-actions">
          {can('employees.create') && (
            <button className="btn btn-primary" onClick={() => setModal('add')}>
              <ion-icon name="person-add-outline" /> {t('employees.addEmployee')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div className="search-row">
            <input
              className="form-control"
              placeholder={t('employees.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
            <select className="form-control form-select" style={{ maxWidth: 200 }} value={dept} onChange={e => { setDept(e.target.value); setPage(1) }}>
              <option value="">{t('employees.allDepartments')}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="form-control form-select" style={{ maxWidth: 160 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              <option value="">{t('employees.allStatus')}</option>
              <option value="active">{t('employees.active')}</option>
              <option value="inactive">{t('employees.inactive')}</option>
            </select>
            {(search || dept || status) && (
              <button className="btn btn-secondary" onClick={() => { setSearch(''); setDept(''); setStatus(''); setPage(1) }}>{t('common.clear')}</button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('employees.employee')}</th>
                <th>{t('employees.badge')}</th>
                <th>{t('employees.department')}</th>
                <th>{t('employees.position')}</th>
                <th>{t('employees.workType')}</th>
                <th>{t('employees.joined')}</th>
                <th>{t('employees.salary')}</th>
                <th>{t('employees.status')}</th>
                <th>{t('employees.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👤</div>
                    <div className="empty-state-title">{t('employees.noEmployeesFound')}</div>
                    <div className="empty-state-text">{t('employees.adjustFilters')}</div>
                  </div>
                </td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{initials(emp)}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.76rem' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">{emp.badge_id || '—'}</td>
                  <td>{emp.department_name || '—'}</td>
                  <td>{emp.job_title || '—'}</td>
                  <td>{emp.work_type_name || '—'}</td>
                  <td>{emp.date_joining?.slice(0,10) || '—'}</td>
                  <td>${Number(emp.salary || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {emp.is_active ? t('employees.active') : t('employees.inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      {can('employees.edit') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => setModal(emp)} title={t('common.edit')}>
                          <ion-icon name="create-outline" />
                        </button>
                      )}
                      {can('employees.edit') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => setResetEmp(emp)} title="Reset Password">
                          <ion-icon name="key-outline" />
                        </button>
                      )}
                      {can('employees.delete') && (
                        <button className="btn btn-sm btn-danger" onClick={() => deleteEmployee(emp.id)} title={t('common.delete')}>
                          <ion-icon name="trash-outline" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
            <span className="page-info">{t('common.showing')} {employees.length} {t('common.of')} {total}</span>
          </div>
        )}
      </div>

      {/* Employee Add/Edit Modal */}
      {modal && (
        <EmployeeModal
          emp={modal === 'add' ? null : modal}
          departments={departments}
          positions={positions}
          workTypes={workTypes}
          shifts={shifts}
          onSave={() => { setModal(null); fetchEmployees() }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Reset Password Modal */}
      {resetEmp && (
        <ResetPasswordModal emp={resetEmp} onClose={() => setResetEmp(null)} />
      )}
    </div>
  )
}
