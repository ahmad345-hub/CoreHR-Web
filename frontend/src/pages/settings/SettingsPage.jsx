import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'

function ItemModal({ title, fields, onSave, onClose, initial = {} }) {
  const { t } = useLang()
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map(f => [f.key, initial[f.key] !== undefined ? String(initial[f.key]) : (f.default ?? '')]))
  )
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header"><span className="modal-title">{title}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-row" style={{ flexWrap:'wrap' }}>
              {fields.map(field => (
                <div key={field.key} className="form-group" style={{ flex: field.full ? '0 0 100%' : undefined }}>
                  <label className="form-label">{field.label}{field.required && ' *'}</label>
                  {field.type === 'textarea' ? (
                    <textarea className="form-control" rows={3} required={field.required} value={form[field.key]} onChange={e => f(field.key, e.target.value)} />
                  ) : field.type === 'select' ? (
                    <select className="form-control form-select" required={field.required} value={form[field.key]} onChange={e => f(field.key, e.target.value)}>
                      <option value="">{t('common.select')}</option>
                      {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={field.type || 'text'} className="form-control" required={field.required} value={form[field.key]} onChange={e => f(field.key, e.target.value)} />
                  )}
                </div>
              ))}
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

function SettingsSection({ icon, title, items, columns, loading, onAdd, onDelete, onEdit, onBulkDelete, modal, searchKey }) {
  const { t, isRTL } = useLang()
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(new Set())
  const [sortKey, setSortKey]       = useState(null)
  const [sortDir, setSortDir]       = useState('asc')

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = items.filter(item => {
    if (search && searchKey) {
      if (!String(item[searchKey] ?? '').toLowerCase().includes(search.toLowerCase())) return false
    }
    return true
  }).sort((a, b) => {
    if (!sortKey) return 0
    const av = String(a[sortKey] ?? '')
    const bv = String(b[sortKey] ?? '')
    const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const allSelected  = filtered.length > 0 && filtered.every(i => selected.has(i.id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    setSelected(prev => {
      const s = new Set(prev)
      if (allSelected) filtered.forEach(i => s.delete(i.id))
      else             filtered.forEach(i => s.add(i.id))
      return s
    })
  }

  const toggleOne = id => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const handleBulkDelete = () => {
    onBulkDelete?.([...selected])
    setSelected(new Set())
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <ion-icon name={icon} style={{ fontSize:18, color:'var(--t-accent)' }} />
          <span className="card-title">{title}</span>
          <span className="badge badge-info">{items.length}</span>
          {filtered.length !== items.length && (
            <span className="badge badge-neutral" style={{ fontSize:11 }}>{filtered.length} {t('settings.shown')}</span>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {searchKey && (
            <div style={{ position:'relative' }}>
              <ion-icon name="search-outline" style={{ position:'absolute', [isRTL ? 'right' : 'left']:8, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'var(--t-muted)', pointerEvents:'none' }} />
              <input
                className="form-control"
                placeholder={t('settings.searchHere')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ [isRTL ? 'paddingRight' : 'paddingLeft']:28, width:160, height:32, fontSize:13 }}
              />
            </div>
          )}

{someSelected && onBulkDelete && (
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
              <ion-icon name="trash-outline" /> {t('settings.bulkDelete')} ({selected.size})
            </button>
          )}

          <button className="btn btn-primary btn-sm" onClick={onAdd}><ion-icon name="add-outline" /> {t('common.add')}</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:40, textAlign:'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                  style={{ cursor:'pointer' }}
                />
              </th>
              {columns.map(c => (
                <th
                  key={c.key}
                  onClick={() => !c.render && handleSort(c.key)}
                  style={!c.render ? { cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' } : undefined}
                >
                  {c.label}
                  {!c.render && (
                    <span style={{ marginLeft:4, opacity: sortKey === c.key ? 1 : 0.3, fontSize:11 }}>
                      {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
                    </span>
                  )}
                </th>
              ))}
              <th>{t('settings.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 2} style={{ textAlign:'center', padding:32 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2}>
                  <div className="empty-state" style={{ padding:24 }}>
                    <div className="empty-state-title">
                      {search ? t('settings.noSearchResults') : t('common.noData')}
                    </div>
                  </div>
                </td>
              </tr>
            ) : filtered.map(item => (
              <tr key={item.id} style={selected.has(item.id) ? { background:'rgba(16,185,129,0.06)' } : undefined}>
                <td style={{ textAlign:'center' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    style={{ cursor:'pointer' }}
                  />
                </td>
                {columns.map(c => (
                  <td key={c.key}>
                    {c.badge  ? <span className="badge badge-info">{item[c.key]}</span>
                    : c.render ? c.render(item)
                    : <span style={c.bold ? { fontWeight:500 } : { color:'var(--t-text-muted)' }}>{item[c.key] ?? '—'}</span>}
                  </td>
                ))}
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    {onEdit && (
                      <button className="btn btn-sm btn-secondary" onClick={() => onEdit(item)} title={t('common.edit')}>
                        <ion-icon name="pencil-outline" />
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(item.id)} title={t('common.delete')}>
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
      {modal}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useLang()
  const [companies, setCompanies]     = useState([])
  const [departments, setDepartments] = useState([])
  const [positions, setPositions]     = useState([])
  const [shifts, setShifts]           = useState([])
  const [holidays, setHolidays]       = useState([])
  const [loading, setLoading]         = useState({})
  const [modal, setModal]             = useState(null)

  const load = useCallback(async () => {
    setLoading({ all: true })
    const [c, d, p, s, h] = await Promise.allSettled([
      api.get('/settings/companies'),
      api.get('/settings/departments'),
      api.get('/settings/positions'),
      api.get('/settings/shifts'),
      api.get('/settings/holidays'),
    ])
    if (c.status === 'fulfilled') setCompanies(c.value.data)
    if (d.status === 'fulfilled') setDepartments(d.value.data)
    if (p.status === 'fulfilled') setPositions(p.value.data)
    if (s.status === 'fulfilled') setShifts(s.value.data)
    if (h.status === 'fulfilled') setHolidays(h.value.data)
    setLoading({})
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = (title, fields, saveHandler, initial = {}) =>
    setModal({ title, fields, saveHandler, initial })
  const closeModal = () => setModal(null)

  const makeAdd = (endpoint, refresh) => async (form) => {
    await api.post(endpoint, form)
    await refresh()
    closeModal()
  }

  const makeEdit = (endpoint, item, refresh) => async (form) => {
    await api.put(`${endpoint}/${item.id}`, form)
    await refresh()
    closeModal()
  }

  const makeDelete = (endpoint, setter) => async id => {
    if (!confirm(t('settings.deleteConfirm'))) return
    await api.delete(`${endpoint}/${id}`)
    setter(items => items.filter(i => i.id !== id))
  }

  const makeBulkDelete = (endpoint, setter) => async ids => {
    if (!confirm(t('settings.bulkDeleteConfirm'))) return
    await Promise.all(ids.map(id => api.delete(`${endpoint}/${id}`)))
    setter(items => items.filter(i => !ids.includes(i.id)))
  }

  const deptOptions = departments.map(d => ({ value: d.id, label: d.name }))

  const companyFields = [
    { key:'name',    label: t('settings.companyName'), required:true },
    { key:'phone',   label: t('settings.phone') },
    { key:'email',   label: t('settings.email'), type:'email' },
    { key:'country', label: t('settings.country') },
    { key:'address', label: t('settings.address'), type:'textarea', full:true },
  ]
  const deptFields = [
    { key:'name', label: t('settings.departmentName'), required:true },
  ]
  const positionFields = [
    { key:'title',         label: t('settings.positionTitle'), required:true },
    { key:'department_id', label: t('employees.department'), type:'select', options:deptOptions },
  ]
  const shiftFields = [
    { key:'name',       label: t('settings.shiftName'),  required:true },
    { key:'start_time', label: t('settings.startTime'), type:'time', required:true },
    { key:'end_time',   label: t('settings.endTime'),   type:'time', required:true },
  ]
  const holidayFields = [
    { key:'name',      label: t('settings.holidayName'), required:true },
    { key:'date',      label: t('settings.date'),         type:'date', required:true },
    { key:'recurring', label: t('settings.recurring'),    type:'select', options:[{value:'1',label: t('settings.annual')},{value:'0',label: t('settings.oneTime')}], default:'0' },
  ]

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.settings.title')}</h1>
          <p className="page-subtitle">{t('pages.settings.subtitle')}</p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Companies */}
        <SettingsSection
          icon="business-outline" title={t('settings.companies')}
          items={companies} loading={loading.all}
          searchKey="name"
          columns={[
            { key:'name',    label: t('settings.name'),    bold:true },
            { key:'phone',   label: t('settings.phone'),   muted:true },
            { key:'email',   label: t('settings.email'),   muted:true },
            { key:'country', label: t('settings.country'), muted:true },
          ]}
          onAdd={() => openModal(t('settings.addCompany'), companyFields, makeAdd('/settings/companies', load))}
          onEdit={item => openModal(t('settings.editCompany'), companyFields, makeEdit('/settings/companies', item, load), item)}
          onDelete={makeDelete('/settings/companies', setCompanies)}
          onBulkDelete={makeBulkDelete('/settings/companies', setCompanies)}
        />

        {/* Departments */}
        <SettingsSection
          icon="git-network-outline" title={t('settings.departments')}
          items={departments} loading={loading.all}
          searchKey="name"
          columns={[
            { key:'name',           label: t('settings.name'),      bold:true },
            { key:'employee_count', label: t('settings.employees'), badge:true },
          ]}
          onAdd={() => openModal(t('settings.addDepartment'), deptFields, makeAdd('/settings/departments', load))}
          onEdit={item => openModal(t('settings.editDepartment'), deptFields, makeEdit('/settings/departments', item, load), item)}
          onDelete={makeDelete('/settings/departments', setDepartments)}
          onBulkDelete={makeBulkDelete('/settings/departments', setDepartments)}
        />

        {/* Job Positions */}
        <SettingsSection
          icon="briefcase-outline" title={t('settings.jobPositions')}
          items={positions} loading={loading.all}
          searchKey="title"
          columns={[
            { key:'title',           label: t('settings.title'),              bold:true },
            { key:'department_name', label: t('employees.department'), muted:true },
          ]}
          onAdd={() => openModal(t('settings.addPosition'), positionFields, makeAdd('/settings/positions', load))}
          onEdit={item => openModal(t('settings.editPosition'), positionFields, makeEdit('/settings/positions', item, load), item)}
          onDelete={makeDelete('/settings/positions', setPositions)}
          onBulkDelete={makeBulkDelete('/settings/positions', setPositions)}
        />

        {/* Shifts */}
        <SettingsSection
          icon="time-outline" title={t('settings.shifts')}
          items={shifts} loading={loading.all}
          searchKey="name"
          columns={[
            { key:'name',       label: t('settings.name'),      bold:true },
            { key:'start_time', label: t('settings.start'), muted:true },
            { key:'end_time',   label: t('settings.end'),   muted:true },
          ]}
          onAdd={() => openModal(t('settings.addShift'), shiftFields, makeAdd('/settings/shifts', load))}
          onEdit={item => openModal(t('settings.editShift'), shiftFields, makeEdit('/settings/shifts', item, load), item)}
          onDelete={makeDelete('/settings/shifts', setShifts)}
          onBulkDelete={makeBulkDelete('/settings/shifts', setShifts)}
        />

        {/* Holidays */}
        <SettingsSection
          icon="calendar-outline" title={t('settings.holidays')}
          items={holidays} loading={loading.all}
          searchKey="name"
          columns={[
            { key:'name',      label: t('settings.holiday'),   bold:true },
            { key:'date',      label: t('settings.date'),      muted:true },
            { key:'recurring', label: t('settings.recurring'), render: item => (
              <span className={`badge ${item.recurring ? 'badge-success' : 'badge-neutral'}`}>
                {item.recurring ? t('settings.annualBadge') : t('settings.onceBadge')}
              </span>
            )},
          ]}
          onAdd={() => openModal(t('settings.addHoliday'), holidayFields, makeAdd('/settings/holidays', load))}
          onEdit={item => openModal(t('settings.editHoliday'), holidayFields, makeEdit('/settings/holidays', item, load), item)}
          onDelete={makeDelete('/settings/holidays', setHolidays)}
          onBulkDelete={makeBulkDelete('/settings/holidays', setHolidays)}
        />
      </div>

      {modal && (
        <ItemModal
          title={modal.title}
          fields={modal.fields}
          initial={modal.initial}
          onSave={modal.saveHandler}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
