import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import api from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const STATUS_BADGE  = { open:'badge-warning', in_progress:'badge-info', resolved:'badge-success', closed:'badge-neutral' }
const PRIORITY_COLOR = { low:'badge-neutral', medium:'badge-warning', high:'badge-danger', urgent:'badge-danger' }

function TicketModal({ categories, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({ subject: '', description: '', category_id: '', priority: 'medium' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/helpdesk/tickets', { ...form, title: form.subject }); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('helpdesk.newSupportTicket')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('helpdesk.subject')} *</label><input className="form-control" required value={form.subject} onChange={e => f('subject', e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('helpdesk.category')}</label>
                <select className="form-control form-select" value={form.category_id} onChange={e => f('category_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t('helpdesk.priority')}</label>
                <select className="form-control form-select" value={form.priority} onChange={e => f('priority', e.target.value)}>
                  <option value="low">{t('helpdesk.low')}</option>
                  <option value="medium">{t('helpdesk.medium')}</option>
                  <option value="high">{t('helpdesk.high')}</option>
                  <option value="urgent">{t('helpdesk.urgent')}</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">{t('helpdesk.description')} *</label><textarea className="form-control" rows={4} required value={form.description} onChange={e => f('description', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('helpdesk.submitting') : t('helpdesk.submitTicket')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CategoryModal({ onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/helpdesk/categories', form); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth:420 }}>
        <div className="modal-header"><span className="modal-title">{t('helpdesk.addCategory')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('helpdesk.name')} *</label><input className="form-control" required value={form.name} onChange={e => f('name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('helpdesk.description')}</label><textarea className="form-control" rows={2} value={form.description} onChange={e => f('description', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.add')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function HelpdeskPage() {
  const { user } = useAuth()
  const { t } = useLang()
  const { can } = usePerms()
  const [tab, setTab] = useState('tickets')
  const [tickets, setTickets] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [loading, setLoading] = useState(true)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)

  const fetchCategories = useCallback(async () => {
    const r = await api.get('/helpdesk/categories')
    setCategories(r.data)
  }, [])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (filterStatus) params.append('status', filterStatus)
      if (filterPriority) params.append('priority', filterPriority)
      const r = await api.get(`/helpdesk/tickets?${params}`)
      setTickets(r.data.results)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } finally { setLoading(false) }
  }, [page, filterStatus, filterPriority])

  useEffect(() => { fetchCategories() }, [])
  useEffect(() => { if (tab === 'tickets') fetchTickets() }, [tab, fetchTickets])

  const updateStatus = async (id, status) => {
    await api.put(`/helpdesk/tickets/${id}`, { status })
    fetchTickets()
  }

  const deleteTicket = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/helpdesk/tickets/${id}`)
    fetchTickets()
  }

  const statusLabel = s => {
    const map = { open: t('helpdesk.open'), in_progress: t('helpdesk.inProgress'), resolved: t('helpdesk.resolved'), closed: t('helpdesk.closed') }
    return map[s] || s?.replace('_',' ')
  }

  const priorityLabel = p => {
    const map = { low: t('helpdesk.low'), medium: t('helpdesk.medium'), high: t('helpdesk.high'), urgent: t('helpdesk.urgent') }
    return map[p] || p
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.helpdesk.title')}</h1>
          <p className="page-subtitle">{t('helpdesk.subtitle')}</p>
        </div>
        <div className="page-actions">
          {tab === 'tickets' && <button className="btn btn-primary" onClick={() => setShowTicketModal(true)}><ion-icon name="add-outline" /> {t('helpdesk.newTicket')}</button>}
          {tab === 'categories' && can('helpdesk.manage') && <button className="btn btn-primary" onClick={() => setShowCatModal(true)}><ion-icon name="add-outline" /> {t('helpdesk.addCategory')}</button>}
        </div>
      </div>

      {/* Helpdesk Charts */}
      {tickets.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('helpdesk.ticketStatus')}</span></div>
            <div className="card-body" style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: [t('helpdesk.open'), t('helpdesk.inProgress'), t('helpdesk.resolved'), t('helpdesk.closed')],
                  datasets: [{ data: [tickets.filter(t=>t.status==='open').length, tickets.filter(t=>t.status==='in_progress').length, tickets.filter(t=>t.status==='resolved').length, tickets.filter(t=>t.status==='closed').length], backgroundColor: ['#f59e0b','#0dcaf0','#40916c','#6c757d'], borderWidth: 2, borderColor: '#fff' }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('helpdesk.byPriority')}</span></div>
            <div className="card-body" style={{ height: 200 }}>
              <Bar
                data={{
                  labels: [t('helpdesk.low'), t('helpdesk.medium'), t('helpdesk.high'), t('helpdesk.urgent')],
                  datasets: [{ data: [tickets.filter(t=>t.priority==='low').length, tickets.filter(t=>t.priority==='medium').length, tickets.filter(t=>t.priority==='high').length, tickets.filter(t=>t.priority==='urgent').length], backgroundColor: ['#6c757d','#f59e0b','#dc3545','#7c0a02'], borderRadius: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } } }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'tickets' ? 'active' : ''}`} onClick={() => setTab('tickets')}>{t('helpdesk.tickets')}</button>
        {can('helpdesk.manage') && (
          <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>{t('helpdesk.categories')}</button>
        )}
      </div>

      {/* Tickets */}
      {tab === 'tickets' && (
        <>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body" style={{ padding:'12px 20px' }}>
              <div className="search-row">
                <select className="form-control form-select" style={{ maxWidth:160 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                  <option value="">{t('helpdesk.allStatus')}</option>
                  <option value="open">{t('helpdesk.open')}</option>
                  <option value="in_progress">{t('helpdesk.inProgress')}</option>
                  <option value="resolved">{t('helpdesk.resolved')}</option>
                  <option value="closed">{t('helpdesk.closed')}</option>
                </select>
                <select className="form-control form-select" style={{ maxWidth:160 }} value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }}>
                  <option value="">{t('helpdesk.allPriority')}</option>
                  <option value="low">{t('helpdesk.low')}</option>
                  <option value="medium">{t('helpdesk.medium')}</option>
                  <option value="high">{t('helpdesk.high')}</option>
                  <option value="urgent">{t('helpdesk.urgent')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>{t('helpdesk.number')}</th>
                  <th>{t('helpdesk.subject')}</th>
                  <th>{t('helpdesk.raisedBy')}</th>
                  <th>{t('helpdesk.category')}</th>
                  <th>{t('helpdesk.priority')}</th>
                  <th>{t('helpdesk.status')}</th>
                  <th>{t('helpdesk.created')}</th>
                  <th>{t('helpdesk.actions')}</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                  ) : tickets.length === 0 ? (
                    <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🎫</div><div className="empty-state-title">{t('helpdesk.noTicketsFound')}</div></div></td></tr>
                  ) : tickets.map(tk => (
                    <tr key={tk.id}>
                      <td className="text-muted">#{tk.id}</td>
                      <td>
                        <div style={{ fontWeight:500 }}>{tk.title}</div>
                        {tk.description && <div className="text-muted" style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>{tk.description}</div>}
                      </td>
                      <td className="text-muted">{tk.employee_name || '—'}</td>
                      <td className="text-muted">{tk.category_name || '—'}</td>
                      <td><span className={`badge ${PRIORITY_COLOR[tk.priority] || 'badge-neutral'}`}>{priorityLabel(tk.priority)}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[tk.status] || 'badge-neutral'}`}>{statusLabel(tk.status)}</span></td>
                      <td className="text-muted">{tk.created_at?.slice(0,10)}</td>
                      <td>
                        <div className="table-actions">
                          {can('helpdesk.manage') && tk.status === 'open' && <button className="btn btn-sm btn-info" onClick={() => updateStatus(tk.id, 'in_progress')}>{t('helpdesk.start')}</button>}
                          {can('helpdesk.manage') && tk.status === 'in_progress' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(tk.id, 'resolved')}>{t('helpdesk.resolve')}</button>}
                          {can('helpdesk.manage') && (tk.status === 'resolved' || tk.status === 'open') && <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(tk.id, 'closed')}>{t('helpdesk.close')}</button>}
                          {can('helpdesk.manage') && <button className="btn btn-sm btn-danger" onClick={() => deleteTicket(tk.id)}><ion-icon name="trash-outline" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
                {Array.from({length:pages},(_,i)=>i+1).map(p=><button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>)}
                <button className="page-btn" disabled={page===pages} onClick={() => setPage(p=>p+1)}>›</button>
                <span className="page-info">{total} {t('common.of')}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('helpdesk.number')}</th>
                <th>{t('helpdesk.name')}</th>
                <th>{t('helpdesk.description')}</th>
              </tr></thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state"><div className="empty-state-icon">🏷️</div><div className="empty-state-title">{t('helpdesk.noCategoriesYet')}</div></div></td></tr>
                ) : categories.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted">{i+1}</td>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td className="text-muted">{c.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTicketModal && <TicketModal categories={categories} onSave={() => { setShowTicketModal(false); fetchTickets() }} onClose={() => setShowTicketModal(false)} />}
      {showCatModal && <CategoryModal onSave={() => { setShowCatModal(false); fetchCategories() }} onClose={() => setShowCatModal(false)} />}
    </div>
  )
}
