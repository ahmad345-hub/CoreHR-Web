import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'
import { usePerms } from '../../hooks/usePerms'

const STATUS_BADGE = { available:'badge-success', allocated:'badge-info', maintenance:'badge-warning', retired:'badge-neutral' }

function AssetModal({ asset, categories, onSave, onClose }) {
  const { t } = useLang()
  const isEdit = !!asset
  const [form, setForm] = useState(asset
    ? { name: asset.name || '', asset_tag: asset.asset_id || '', category_id: asset.category_id || '', purchase_date: asset.purchase_date || '', purchase_cost: asset.purchase_cost || '', status: asset.status || 'available' }
    : { name: '', asset_tag: '', category_id: '', purchase_date: '', purchase_cost: '', status: 'available' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, asset_id: form.asset_tag }
      if (isEdit) await api.put(`/assets/${asset.id}`, payload)
      else await api.post('/assets', payload)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{isEdit ? t('assets.editAsset') : t('assets.addAsset')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('assets.assetName')} *</label><input className="form-control" required value={form.name} onChange={e => f('name', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('assets.assetTag')}</label><input className="form-control" value={form.asset_tag} onChange={e => f('asset_tag', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('assets.category')}</label>
                <select className="form-control form-select" value={form.category_id} onChange={e => f('category_id', e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t('assets.status')}</label>
                <select className="form-control form-select" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="available">{t('assets.available')}</option>
                  <option value="maintenance">{t('assets.maintenance')}</option>
                  <option value="retired">{t('assets.retired')}</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t('assets.purchaseDate')}</label><input type="date" className="form-control" value={form.purchase_date} onChange={e => f('purchase_date', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t('assets.purchaseCost')}</label><input type="number" className="form-control" value={form.purchase_cost} onChange={e => f('purchase_cost', e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : (isEdit ? t('common.save') : t('assets.addAsset'))}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AllocateModal({ assets, employees, onSave, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({ asset_id: '', employee_id: '', allocation_date: new Date().toISOString().slice(0,10), notes: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/assets/allocate', { ...form, note: form.notes }); onSave() }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header"><span className="modal-title">{t('assets.allocateAsset')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('assets.asset')} *</label>
              <select className="form-control form-select" required value={form.asset_id} onChange={e => f('asset_id', e.target.value)}>
                <option value="">{t('common.select')}</option>
                {assets.filter(a => a.status === 'available').map(a => <option key={a.id} value={a.id}>{a.name} {a.asset_id ? `(${a.asset_id})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{t('assets.employee')} *</label>
              <select className="form-control form-select" required value={form.employee_id} onChange={e => f('employee_id', e.target.value)}>
                <option value="">{t('common.select')}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">{t('assets.date')}</label><input type="date" className="form-control" value={form.allocation_date} onChange={e => f('allocation_date', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('assets.notes')}</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('assets.allocating') : t('assets.allocate')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CategoryModal({ category, onSave, onClose }) {
  const { t } = useLang()
  const isEdit = !!category
  const [form, setForm] = useState(category ? { name: category.name || '', description: category.description || '' } : { name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (isEdit) await api.put(`/assets/categories/${category.id}`, form)
      else await api.post('/assets/categories', form)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth:420 }}>
        <div className="modal-header"><span className="modal-title">{isEdit ? t('assets.editCategory') : t('assets.addCategory')}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{t('assets.name')} *</label><input className="form-control" required value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">{t('assets.description')}</label><textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(p=>({...p, description: e.target.value}))} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : (isEdit ? t('common.save') : t('common.add'))}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AssetsPage() {
  const { t } = useLang()
  const { can } = usePerms()
  const [tab, setTab] = useState('assets')
  const [assets, setAssets] = useState([])
  const [allocations, setAllocations] = useState([])
  const [categories, setCategories] = useState([])
  const [employees, setEmployees] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [showAllocModal, setShowAllocModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editCategory, setEditCategory] = useState(null)

  const fetchCategories = useCallback(async () => {
    const r = await api.get('/assets/categories')
    setCategories(r.data)
  }, [])

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit:15 })
      if (filterStatus) params.append('status', filterStatus)
      const r = await api.get(`/assets?${params}`)
      setAssets(r.data.results)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } finally { setLoading(false) }
  }, [page, filterStatus])

  useEffect(() => { fetchCategories(); api.get('/employees?limit=200').then(r => setEmployees(r.data.results)) }, [])
  useEffect(() => { if (tab === 'assets') fetchAssets() }, [tab, fetchAssets])
  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    if (tab === 'allocations') {
      setLoading(true)
      api.get('/assets/allocations').then(r => setAllocations(r.data)).finally(() => setLoading(false))
    }
  }, [tab, refreshKey])

  const returnAsset = async id => {
    await api.post(`/assets/return/${id}`, { return_date: new Date().toISOString().slice(0,10) })
    api.get('/assets/allocations').then(r => setAllocations(r.data))
  }

  const deleteAsset = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/assets/${id}`)
    fetchAssets()
  }

  const deleteCategory = async id => {
    if (!confirm(t('common.confirm'))) return
    await api.delete(`/assets/categories/${id}`)
    fetchCategories()
  }

  const statusLabel = s => {
    const map = { available: t('assets.available'), allocated: t('assets.allocated'), maintenance: t('assets.maintenance'), retired: t('assets.retired') }
    return map[s] || s
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.assets.title')}</h1>
          <p className="page-subtitle">{t('assets.subtitle')}</p>
        </div>
        <div className="page-actions">
          {tab === 'assets' && <>
            <button className="btn btn-secondary" onClick={() => setShowAllocModal(true)}><ion-icon name="swap-horizontal-outline" /> {t('assets.allocate')}</button>
            <button className="btn btn-primary" onClick={() => setShowAssetModal(true)}><ion-icon name="add-outline" /> {t('assets.addAsset')}</button>
          </>}
          {tab === 'categories' && can('assets.manage') && <button className="btn btn-primary" onClick={() => setShowCatModal(true)}><ion-icon name="add-outline" /> {t('assets.addCategory')}</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'assets' ? 'active' : ''}`} onClick={() => setTab('assets')}>{t('assets.assetsTab')}</button>
        <button className={`tab ${tab === 'allocations' ? 'active' : ''}`} onClick={() => setTab('allocations')}>{t('assets.allocationsTab')}</button>
        <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>{t('assets.categoriesTab')}</button>
      </div>

      {/* Assets */}
      {tab === 'assets' && (
        <>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body" style={{ padding:'12px 20px' }}>
              <div className="search-row">
                <select className="form-control form-select" style={{ maxWidth:180 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                  <option value="">{t('assets.allStatus')}</option>
                  <option value="available">{t('assets.available')}</option>
                  <option value="allocated">{t('assets.allocated')}</option>
                  <option value="maintenance">{t('assets.maintenance')}</option>
                  <option value="retired">{t('assets.retired')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>{t('assets.name')}</th>
                  <th>{t('assets.tag')}</th>
                  <th>{t('assets.category')}</th>
                  <th>{t('assets.purchaseDate')}</th>
                  <th>{t('assets.cost')}</th>
                  <th>{t('assets.status')}</th>
                  <th>{t('assets.actions')}</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                  ) : assets.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">🖥️</div><div className="empty-state-title">{t('assets.noAssetsFound')}</div></div></td></tr>
                  ) : assets.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight:500 }}>{a.name}</td>
                      <td className="text-muted">{a.asset_id || '—'}</td>
                      <td className="text-muted">{a.category_name || '—'}</td>
                      <td className="text-muted">{a.purchase_date || '—'}</td>
                      <td>{a.purchase_cost ? `$${Number(a.purchase_cost).toLocaleString()}` : '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-neutral'}`}>{statusLabel(a.status)}</span></td>
                      <td>
                        <div className="table-actions">
                          {can('assets.manage') && <button className="btn btn-sm btn-secondary" onClick={() => { setEditAsset(a); setShowAssetModal(true) }}><ion-icon name="create-outline" /></button>}
                          {can('assets.manage') && <button className="btn btn-sm btn-danger" onClick={() => deleteAsset(a.id)}><ion-icon name="trash-outline" /></button>}
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

      {/* Allocations */}
      {tab === 'allocations' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('assets.asset')}</th>
                <th>{t('assets.employee')}</th>
                <th>{t('assets.allocatedDate')}</th>
                <th>{t('assets.returned')}</th>
                <th>{t('assets.notes')}</th>
                <th>{t('assets.actions')}</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                ) : allocations.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-title">{t('assets.noAllocationsYet')}</div></div></td></tr>
                ) : allocations.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight:500 }}>{a.asset_name}</td>
                    <td>{a.employee_name}</td>
                    <td className="text-muted">{a.allocation_date}</td>
                    <td>{a.return_date ? <span className="badge badge-success">{a.return_date}</span> : <span className="badge badge-warning">{t('assets.active')}</span>}</td>
                    <td className="text-muted">{a.notes || '—'}</td>
                    <td>
                      {!a.return_date && can('assets.manage') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => returnAsset(a.id)}>{t('assets.return')}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('assets.number')}</th>
                <th>{t('assets.name')}</th>
                <th>{t('assets.description')}</th>
                {can('assets.manage') && <th>{t('common.actions')}</th>}
              </tr></thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-icon">🗂️</div><div className="empty-state-title">{t('assets.noCategoriesYet')}</div></div></td></tr>
                ) : categories.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted">{i+1}</td>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td className="text-muted">{c.description || '—'}</td>
                    {can('assets.manage') && (
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditCategory(c); setShowCatModal(true) }}><ion-icon name="create-outline" /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(c.id)}><ion-icon name="trash-outline" /></button>
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

      {showAssetModal && <AssetModal asset={editAsset} categories={categories} onSave={() => { setShowAssetModal(false); setEditAsset(null); fetchAssets() }} onClose={() => { setShowAssetModal(false); setEditAsset(null) }} />}
      {showAllocModal && <AllocateModal assets={assets} employees={employees} onSave={() => { setShowAllocModal(false); reload() }} onClose={() => setShowAllocModal(false)} />}
      {showCatModal && <CategoryModal category={editCategory} onSave={() => { setShowCatModal(false); setEditCategory(null); fetchCategories() }} onClose={() => { setShowCatModal(false); setEditCategory(null) }} />}
    </div>
  )
}
