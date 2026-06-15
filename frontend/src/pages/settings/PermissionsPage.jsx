import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'

const CATEGORIES = [
  { key: 'main', label_en: 'Main', label_ar: 'الرئيسية' },
  { key: 'workforce', label_en: 'Workforce', label_ar: 'القوى العاملة' },
  { key: 'finance', label_en: 'Finance', label_ar: 'المالية' },
  { key: 'talent', label_en: 'Talent', label_ar: 'المواهب' },
  { key: 'operations', label_en: 'Operations', label_ar: 'العمليات' },
  { key: 'analytics', label_en: 'Analytics', label_ar: 'التحليلات' },
  { key: 'system', label_en: 'System', label_ar: 'النظام' },
]

const ROLE_COLORS = {
  admin: '#dc2626',
  manager: '#2563eb',
  employee: '#16a34a',
}

export default function PermissionsPage() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const isRTL = lang === 'ar'

  const [users, setUsers] = useState([])
  const [allPerms, setAllPerms] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [editPerms, setEditPerms] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [roleDropdown, setRoleDropdown] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, permsRes] = await Promise.all([
        api.get('/permissions/users'),
        api.get('/permissions/all-permissions'),
      ])
      setUsers(usersRes.data)
      setAllPerms(permsRes.data)
      if (usersRes.data.length > 0 && !selectedUser) {
        const first = usersRes.data[0]
        setSelectedUser(first)
        setEditPerms({ ...first.permissions })
      }
    } catch (err) {
      console.error('Load permissions error:', err)
    }
    setLoading(false)
  }

  const selectUser = (u) => {
    setSelectedUser(u)
    setEditPerms({ ...u.permissions })
    setFeedback(null)
  }

  const togglePerm = (key) => {
    setEditPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleCategory = (catKey) => {
    const catPerms = allPerms.filter(p => p.category === catKey)
    const allOn = catPerms.every(p => editPerms[p.key] === true)
    const newVal = !allOn
    setEditPerms(prev => {
      const next = { ...prev }
      catPerms.forEach(p => { next[p.key] = newVal })
      return next
    })
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    setSaving(true)
    setFeedback(null)
    try {
      await api.put(`/permissions/user/${selectedUser.id}`, { permissions: editPerms })
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, permissions: { ...editPerms } } : u
      ))
      setSelectedUser(prev => ({ ...prev, permissions: { ...editPerms } }))
      setFeedback({ type: 'success', msg: isRTL ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully' })
    } catch (err) {
      setFeedback({ type: 'error', msg: isRTL ? 'فشل في حفظ الصلاحيات' : 'Failed to save permissions' })
    }
    setSaving(false)
  }

  const applyDefaults = async (role) => {
    if (!selectedUser) return
    setRoleDropdown(false)
    setSaving(true)
    try {
      const res = await api.post(`/permissions/role-defaults/${selectedUser.id}`, { role })
      setEditPerms({ ...res.data.permissions })
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, permissions: { ...res.data.permissions } } : u
      ))
      setSelectedUser(prev => ({ ...prev, permissions: { ...res.data.permissions } }))
      setFeedback({ type: 'success', msg: isRTL ? `تم تطبيق صلاحيات ${role}` : `Applied ${role} defaults` })
    } catch (err) {
      setFeedback({ type: 'error', msg: isRTL ? 'فشل في تطبيق الافتراضيات' : 'Failed to apply defaults' })
    }
    setSaving(false)
  }

  const filteredUsers = users.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      u.first_name?.toLowerCase().includes(s) ||
      u.last_name?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.department?.toLowerCase().includes(s)
    )
  })

  const permsByCategory = CATEGORIES.map(cat => ({
    ...cat,
    perms: allPerms.filter(p => p.category === cat.key),
  })).filter(c => c.perms.length > 0)

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'صلاحيات المستخدمين' : 'User Permissions'}</h1>
          <p className="page-subtitle">{isRTL ? 'إدارة صلاحيات كل مستخدم على حدة' : 'Manage individual user permissions'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {/* Left: User List */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-header" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <span className="card-title">{isRTL ? 'المستخدمون' : 'Users'}</span>
              <span className="badge badge-info">{users.length}</span>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <input
                className="form-control"
                placeholder={isRTL ? 'بحث...' : 'Search users...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  onClick={() => selectUser(u)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--t-border)',
                    background: selectedUser?.id === u.id ? 'rgba(16,185,129,0.08)' : 'transparent',
                    borderLeft: selectedUser?.id === u.id ? '3px solid var(--t-accent)' : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                  onMouseLeave={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.first_name} {u.last_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        padding: '1px 6px', borderRadius: 4,
                        background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role],
                      }}>
                        {u.role}
                      </span>
                      {u.department && (
                        <span style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>{u.department}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-text-muted)', fontSize: 13 }}>
                  {isRTL ? 'لا يوجد مستخدمون' : 'No users found'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Permission Editor */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedUser ? (
            <div className="card">
              {/* User header */}
              <div className="card-header" style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <div className="avatar" style={{ width: 42, height: 42, fontSize: 15 }}>
                    {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{selectedUser.first_name} {selectedUser.last_name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 4,
                        background: ROLE_COLORS[selectedUser.role] + '18', color: ROLE_COLORS[selectedUser.role],
                      }}>
                        {selectedUser.role}
                      </span>
                      {selectedUser.department && (
                        <span style={{ fontSize: 12, color: 'var(--t-text-muted)' }}>{selectedUser.department}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Apply defaults dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setRoleDropdown(!roleDropdown)}
                  >
                    <ion-icon name="refresh-outline" />
                    {isRTL ? 'تطبيق الافتراضيات' : 'Apply Defaults'}
                    <ion-icon name="chevron-down-outline" style={{ fontSize: 12, marginLeft: 4 }} />
                  </button>
                  {roleDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: 'var(--t-card)', border: '1px solid var(--t-border)',
                      borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      zIndex: 100, minWidth: 140, overflow: 'hidden',
                    }}>
                      {['admin', 'manager', 'employee'].map(r => (
                        <div
                          key={r}
                          onClick={() => applyDefaults(r)}
                          style={{
                            padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                            borderBottom: r !== 'employee' ? '1px solid var(--t-border)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: ROLE_COLORS[r], display: 'inline-block',
                          }} />
                          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Permission categories */}
              <div className="card-body" style={{ padding: '16px 20px' }}>
                {permsByCategory.map(cat => {
                  const catPerms = cat.perms
                  const allOn = catPerms.every(p => editPerms[p.key] === true)
                  const someOn = catPerms.some(p => editPerms[p.key] === true) && !allOn

                  return (
                    <div key={cat.key} style={{ marginBottom: 20 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                        paddingBottom: 8, borderBottom: '1px solid var(--t-border)',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      }}>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        }}>
                          <input
                            type="checkbox"
                            checked={allOn}
                            ref={el => { if (el) el.indeterminate = someOn }}
                            onChange={() => toggleCategory(cat.key)}
                            style={{ width: 16, height: 16, accentColor: 'var(--t-accent)', cursor: 'pointer' }}
                          />
                          {isRTL ? cat.label_ar : cat.label_en}
                        </label>
                        <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                          {catPerms.filter(p => editPerms[p.key]).length}/{catPerms.length}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '6px 16px',
                        paddingLeft: isRTL ? 0 : 12,
                        paddingRight: isRTL ? 12 : 0,
                      }}>
                        {catPerms.map(p => (
                          <label
                            key={p.key}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                              background: editPerms[p.key] ? 'rgba(16,185,129,0.06)' : 'transparent',
                              transition: 'background 0.15s',
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = editPerms[p.key] ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = editPerms[p.key] ? 'rgba(16,185,129,0.06)' : 'transparent'}
                          >
                            <div style={{ position: 'relative', width: 38, height: 20, flexShrink: 0 }}>
                              <input
                                type="checkbox"
                                checked={editPerms[p.key] || false}
                                onChange={() => togglePerm(p.key)}
                                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                              />
                              <div style={{
                                width: 38, height: 20, borderRadius: 10,
                                background: editPerms[p.key] ? 'var(--t-accent, #10b981)' : '#ccc',
                                transition: 'background 0.2s', cursor: 'pointer',
                                position: 'relative',
                              }}>
                                <div style={{
                                  width: 16, height: 16, borderRadius: '50%',
                                  background: '#fff', position: 'absolute', top: 2,
                                  left: editPerms[p.key] ? 20 : 2,
                                  transition: 'left 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }} />
                              </div>
                            </div>
                            <span style={{ fontSize: 13, color: editPerms[p.key] ? 'var(--t-text)' : 'var(--t-text-muted)' }}>
                              {isRTL ? p.label_ar : p.label_en}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Feedback */}
                {feedback && (
                  <div style={{
                    padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
                    background: feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)',
                    color: feedback.type === 'success' ? '#059669' : '#dc2626',
                    border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  }}>
                    {feedback.msg}
                  </div>
                )}

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end', paddingTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={savePermissions}
                    disabled={saving}
                    style={{ minWidth: 160 }}
                  >
                    {saving ? (
                      <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: '0 8px 0 0' }} /> {isRTL ? 'جاري الحفظ...' : 'Saving...'}</>
                    ) : (
                      <><ion-icon name="checkmark-outline" /> {isRTL ? 'حفظ الصلاحيات' : 'Save Permissions'}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>
                  <ion-icon name="shield-outline" />
                </div>
                <div style={{ fontSize: 14, color: 'var(--t-text-muted)' }}>
                  {isRTL ? 'اختر مستخدم لتعديل صلاحياته' : 'Select a user to manage their permissions'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
