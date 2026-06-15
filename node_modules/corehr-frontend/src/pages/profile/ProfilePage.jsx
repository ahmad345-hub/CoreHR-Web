import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'

const STATUS_BADGE = { approved:'badge-success', pending:'badge-warning', rejected:'badge-danger', cancelled:'badge-neutral' }
const ATTENDANCE_BADGE = { present:'badge-success', absent:'badge-danger', leave:'badge-warning', 'half-day':'badge-info' }

function InfoRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid var(--t-border)' }}>
      <ion-icon name={icon} style={{ fontSize:16, color:'var(--t-accent)', marginTop:2, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{label}</div>
        <div style={{ fontWeight:500, color:'var(--t-text)', wordBreak:'break-word' }}>{value}</div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { t } = useLang()
  const [tab, setTab] = useState('overview')
  const [attendance, setAttendance] = useState([])
  const [leaveData, setLeaveData] = useState({ requests: [], allocations: [] })
  const [empDetail, setEmpDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const [cvUploading, setCvUploading] = useState(false)
  const [cvMsg, setCvMsg] = useState('')
  const [cvMsgOk, setCvMsgOk] = useState(true)

  const empId = user?.employee?.id
  const emp = empDetail || user?.employee

  useEffect(() => {
    if (!empId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      api.get('/employees/me'),
      api.get('/employees/me/attendance'),
      api.get('/employees/me/leave'),
    ]).then(([e, a, l]) => {
      setEmpDetail(e.data)
      setAttendance(a.data)
      setLeaveData(l.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [empId])

  const changePw = async e => {
    e.preventDefault()
    setPwError(''); setPwSuccess('')
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError(t('profile.noMatch')); return }
    if (pwForm.new_password.length < 6) { setPwError(t('profile.tooShort')); return }
    setPwLoading(true)
    try {
      await api.post('/auth/change-password', { old_password: pwForm.old_password, new_password: pwForm.new_password })
      setPwSuccess(t('profile.pwChanged'))
      setPwForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPwError(err.response?.data?.error || t('profile.pwFailed'))
    } finally { setPwLoading(false) }
  }

  const handleCVUpload = async e => {
    const file = e.target.files[0]
    if (!file) return
    setCvUploading(true); setCvMsg(''); setCvMsgOk(true)
    try {
      const fd = new FormData()
      fd.append('cv', file)
      const res = await api.post('/employees/me/cv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setEmpDetail(prev => ({ ...(prev || {}), resume_url: res.data.resume_url }))
      setCvMsg('CV uploaded successfully!')
      setCvMsgOk(true)
    } catch (err) {
      setCvMsg(err.response?.data?.error || 'Upload failed')
      setCvMsgOk(false)
    } finally { setCvUploading(false); e.target.value = '' }
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'U'
  const role = user?.is_superuser ? t('profile.superAdmin') : user?.is_staff ? t('profile.hrManager') : t('profile.employee')
  const roleColor = user?.is_superuser ? '#6f42c1' : user?.is_staff ? '#0d6efd' : 'var(--t-accent)'

  const presentCount = attendance.filter(a => a.status === 'present').length
  const totalHours   = attendance.reduce((s, a) => s + (a.worked_hours || 0), 0).toFixed(1)

  const attendStatusLabel = s => {
    const map = { present: t('profile.present'), absent: t('profile.absent'), leave: t('profile.onLeave') }
    return map[s] || s
  }

  return (
    <div className="page-wrapper" style={{ paddingBottom:80 }}>

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--t-white)',
        borderRadius: 16,
        border: '1px solid var(--t-border)',
        boxShadow: '0 2px 16px rgba(26,60,46,0.08)',
        marginBottom: 24,
        overflow: 'hidden',
      }}>
        {/* Avatar + Name row */}
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>

            {/* Avatar */}
            <div style={{
              width:72, height:72, borderRadius:16, flexShrink:0,
              background:'linear-gradient(135deg, #40916c, #1b4332)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:26, fontWeight:800, color:'#fff',
              boxShadow:'0 4px 14px rgba(26,60,46,0.20)',
            }}>{initials}</div>

            {/* Name + role + meta */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                <h2 style={{ fontSize:19, fontWeight:700, color:'var(--t-dark)', margin:0 }}>
                  {user?.first_name} {user?.last_name}
                </h2>
                <span style={{
                  background: roleColor + '18', color: roleColor,
                  fontSize:11, fontWeight:700, padding:'2px 10px',
                  borderRadius:20, border:`1px solid ${roleColor}30`,
                }}>
                  {role}
                </span>
                {emp?.is_active !== 0 && (
                  <span className="badge badge-success" style={{ fontSize:10 }}>{t('profile.active')}</span>
                )}
              </div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {emp?.job_title && (
                  <span style={{ fontSize:13, color:'var(--t-muted)', display:'flex', alignItems:'center', gap:4 }}>
                    <ion-icon name="briefcase-outline" style={{ fontSize:13 }} />{emp.job_title}
                  </span>
                )}
                {emp?.department_name && (
                  <span style={{ fontSize:13, color:'var(--t-muted)', display:'flex', alignItems:'center', gap:4 }}>
                    <ion-icon name="git-network-outline" style={{ fontSize:13 }} />{emp.department_name}
                  </span>
                )}
                <span style={{ fontSize:13, color:'var(--t-muted)', display:'flex', alignItems:'center', gap:4 }}>
                  <ion-icon name="mail-outline" style={{ fontSize:13 }} />{user?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats strip or admin notice */}
          <div style={{ marginTop:20 }}>
            {emp ? (
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit, minmax(90px, 1fr))',
                gap:1,
                background:'var(--t-border)',
                border:'1px solid var(--t-border)',
                borderRadius:12,
                overflow:'hidden',
              }}>
                {[
                  { label: t('profile.badgeId'),  value: emp.badge_id || t('profile.nA') },
                  { label: t('profile.joined'),   value: emp.date_joining?.slice(0,7) || t('profile.nA') },
                  { label: t('profile.company'),  value: emp.company_name || t('profile.nA') },
                  { label: t('profile.workType'), value: emp.work_type_name || t('profile.nA') },
                  { label: t('profile.shift'),    value: emp.shift_name || t('profile.nA') },
                ].map(s => (
                  <div key={s.label} style={{ background:'var(--t-white)', textAlign:'center', padding:'10px 6px' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--t-dark)', lineHeight:1.2, wordBreak:'break-word' }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background:'#eff6ff', border:'1px solid #bfdbfe',
                borderRadius:12, padding:'12px 18px',
                display:'flex', alignItems:'center', gap:10,
              }}>
                <ion-icon name="information-circle-outline" style={{ fontSize:18, color:'#3b82f6', flexShrink:0 }} />
                <span style={{ fontSize:13, color:'#1e40af' }}>{t('profile.adminAccount')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + main ──────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, alignItems:'start' }}>

        {/* Sidebar cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('profile.personalInformation')}</span>
            </div>
            <div style={{ padding:'4px 20px 16px' }}>
              <InfoRow icon="person-outline"      label={t('profile.username')} value={user?.username} />
              <InfoRow icon="mail-outline"         label={t('profile.email')}    value={user?.email} />
              <InfoRow icon="call-outline"         label={t('profile.phone')}    value={emp?.phone} />
              <InfoRow icon="calendar-outline"     label={t('profile.dob')}      value={emp?.dob} />
              <InfoRow icon="transgender-outline"  label={t('profile.gender')}   value={emp?.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : null} />
              <InfoRow icon="location-outline"     label={t('profile.address')}  value={[emp?.address, emp?.city, emp?.country].filter(Boolean).join(', ')} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('profile.employmentDetails')}</span>
            </div>
            {emp ? (
              <div style={{ padding:'4px 20px 16px' }}>
                <InfoRow icon="id-card-outline"          label={t('profile.employeeId')}  value={String(empId)} />
                <InfoRow icon="barcode-outline"          label={t('profile.badgeId')}      value={emp.badge_id} />
                <InfoRow icon="business-outline"         label={t('profile.company')}      value={emp.company_name} />
                <InfoRow icon="git-network-outline"      label={t('profile.department')}   value={emp.department_name} />
                <InfoRow icon="briefcase-outline"        label={t('profile.jobTitle')}     value={emp.job_title} />
                <InfoRow icon="desktop-outline"          label={t('profile.workType')}     value={emp.work_type_name} />
                <InfoRow icon="time-outline"             label={t('profile.shift')}        value={emp.shift_name} />
                <InfoRow icon="calendar-number-outline"  label={t('profile.dateJoining')}  value={emp.date_joining} />
                {emp.salary > 0 && <InfoRow icon="cash-outline" label={t('profile.salary')} value={`$${Number(emp.salary).toLocaleString()}`} />}
              </div>
            ) : (
              <div style={{ padding:'24px', textAlign:'center', color:'var(--t-muted)' }}>
                <ion-icon name="person-remove-outline" style={{ fontSize:32, display:'block', margin:'0 auto 8px' }} />
                <div style={{ fontSize:13 }}>{t('profile.noEmployeeProfile')}</div>
              </div>
            )}
          </div>
          {/* CV Card — only for employees */}
          {empId && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">My Resume / CV</span>
              </div>
              <div style={{ padding:'16px 20px' }}>
                {emp?.resume_url ? (
                  <a
                    href={`http://localhost:5000${emp.resume_url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      background:'#f0faf2', border:'1px solid #b7e4c7',
                      borderRadius:10, padding:'10px 14px',
                      color:'#40916c', fontWeight:600, fontSize:13,
                      textDecoration:'none', marginBottom:12,
                    }}
                  >
                    <ion-icon name="document-text-outline" style={{ fontSize:18 }} />
                    Download Current CV
                  </a>
                ) : (
                  <div style={{
                    textAlign:'center', padding:'16px 0',
                    color:'var(--t-muted)', fontSize:13, marginBottom:12,
                  }}>
                    <ion-icon name="document-outline" style={{ fontSize:32, display:'block', margin:'0 auto 6px' }} />
                    No CV uploaded yet
                  </div>
                )}

                {cvMsg && (
                  <div style={{
                    background: cvMsgOk ? '#f0faf2' : '#fef2f2',
                    border: `1px solid ${cvMsgOk ? '#b7e4c7' : '#fecaca'}`,
                    borderRadius:8, padding:'8px 12px', marginBottom:10,
                    fontSize:12, color: cvMsgOk ? '#40916c' : '#e63946',
                    display:'flex', alignItems:'center', gap:6,
                  }}>
                    <ion-icon name={cvMsgOk ? 'checkmark-circle-outline' : 'alert-circle-outline'} style={{ fontSize:14, flexShrink:0 }} />
                    {cvMsg}
                  </div>
                )}

                <label style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  background:'var(--t-accent)', color:'#fff',
                  borderRadius:8, padding:'9px 0', cursor: cvUploading ? 'not-allowed' : 'pointer',
                  fontSize:13, fontWeight:600, opacity: cvUploading ? 0.7 : 1,
                }}>
                  <ion-icon name="cloud-upload-outline" style={{ fontSize:16 }} />
                  {cvUploading ? 'Uploading…' : emp?.resume_url ? 'Replace CV' : 'Upload CV'}
                  <input type="file" accept=".pdf,.doc,.docx" style={{ display:'none' }} onChange={handleCVUpload} disabled={cvUploading} />
                </label>
                <div style={{ fontSize:11, color:'var(--t-muted)', textAlign:'center', marginTop:6 }}>PDF, DOC, DOCX — max 5 MB</div>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div>
          <div className="tabs">
            <button className={`tab ${tab==='overview'   ? 'active' : ''}`} onClick={() => setTab('overview')}>{t('profile.overview')}</button>
            <button className={`tab ${tab==='attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>{t('profile.attendanceTab')}</button>
            <button className={`tab ${tab==='leave'      ? 'active' : ''}`} onClick={() => setTab('leave')}>{t('profile.leaveTab')}</button>
            <button className={`tab ${tab==='security'   ? 'active' : ''}`} onClick={() => setTab('security')}>{t('profile.security')}</button>
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {empId && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {loading ? (
                    <div style={{ gridColumn:'1/-1', textAlign:'center', padding:32 }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
                  ) : [
                    { icon:'checkmark-circle-outline', label: t('profile.daysPresent'), value: presentCount > 0 ? presentCount : '—', color:'#40916c', bg:'#f0faf2' },
                    { icon:'time-outline',             label: t('profile.hoursWorked'), value: Number(totalHours) > 0 ? `${totalHours}h` : '—', color:'#0d6efd', bg:'#eff6ff' },
                    { icon:'calendar-outline',         label: t('profile.leaveDays'),   value: leaveData.allocations.reduce((s,a)=>s+(a.total_days||0),0) || '—', color:'#fb8500', bg:'#fff7ed' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius:14, padding:'18px 16px', display:'flex', alignItems:'center', gap:14, border:'1px solid var(--t-border)' }}>
                      <div style={{ width:42, height:42, borderRadius:12, background: s.color + '20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <ion-icon name={s.icon} style={{ fontSize:22, color: s.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize:22, fontWeight:800, color: s.color, lineHeight:1 }}>{s.value}</div>
                        <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:4 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {empId && !loading && leaveData.allocations.length > 0 && (
                <LeaveAllocations allocs={leaveData.allocations} />
              )}

              <div className="card">
                <div className="card-header"><span className="card-title">{t('profile.accountInformation')}</span></div>
                <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[
                    [t('profile.userId'),       `#${user?.id}`],
                    [t('profile.role'),          role],
                    [t('profile.username'),      user?.username],
                    [t('profile.emailVerified'), t('profile.yes')],
                    [t('profile.accountStatus'), t('profile.active')],
                    [t('profile.twoFactorAuth'), t('profile.notEnabled')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <div style={{ fontSize:11, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{k}</div>
                      <div style={{ fontWeight:500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attendance */}
          {tab === 'attendance' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {attendance.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    { label: t('profile.present'),  value: attendance.filter(a=>a.status==='present').length, color:'#40916c' },
                    { label: t('profile.absent'),   value: attendance.filter(a=>a.status==='absent').length,  color:'#e63946' },
                    { label: t('profile.onLeave'),  value: attendance.filter(a=>a.status==='leave').length,   color:'#fb8500' },
                    { label: t('profile.avgHours'), value: attendance.length > 0 ? (attendance.reduce((s,a)=>s+(a.worked_hours||0),0) / (attendance.filter(a=>a.worked_hours>0).length||1)).toFixed(1)+'h' : '—', color:'#0d6efd' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ textAlign:'center', padding:'16px 0' }}>
                      <div style={{ fontSize:26, fontWeight:800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="card">
                <div className="card-header"><span className="card-title">{t('profile.last30Records')}</span></div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th>{t('profile.date')}</th>
                      <th>{t('profile.clockIn')}</th>
                      <th>{t('profile.clockOut')}</th>
                      <th>{t('profile.hours')}</th>
                      <th>{t('profile.status')}</th>
                    </tr></thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                      ) : attendance.length === 0 ? (
                        <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">⏰</div><div className="empty-state-title">{t('profile.noAttendanceRecords')}</div></div></td></tr>
                      ) : attendance.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight:500 }}>{a.date}</td>
                          <td className="text-muted">{a.clock_in ? a.clock_in.slice(11,16) : '—'}</td>
                          <td className="text-muted">{a.clock_out ? a.clock_out.slice(11,16) : '—'}</td>
                          <td>{a.worked_hours ? <span className="badge badge-info">{a.worked_hours}h</span> : '—'}</td>
                          <td><span className={`badge ${ATTENDANCE_BADGE[a.status] || 'badge-neutral'}`}>{attendStatusLabel(a.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Leave */}
          {tab === 'leave' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">{t('profile.leaveBalance')}</span></div>
                {loading ? (
                  <div style={{ textAlign:'center', padding:32 }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
                ) : leaveData.allocations.length === 0 ? (
                  <div className="empty-state" style={{ padding:32 }}>
                    <div className="empty-state-icon">🏖️</div>
                    <div className="empty-state-title">{t('profile.noAllocations')}</div>
                  </div>
                ) : (
                  <div style={{ padding:'8px 20px 20px' }}>
                    {leaveData.allocations.map(a => {
                      const used = a.used_days || 0
                      const total = a.total_days || 0
                      const remaining = Math.max(0, total - used)
                      const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
                      return (
                        <div key={a.id} style={{ padding:'14px 0', borderBottom:'1px solid var(--t-border)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, alignItems:'center' }}>
                            <div style={{ fontWeight:600 }}>{a.leave_type_name}</div>
                            <div style={{ fontSize:12, color:'var(--t-muted)' }}>
                              <span style={{ fontWeight:700, color: remaining>2?'#40916c':'#e63946' }}>{remaining}</span> / {total} {t('profile.daysLeft')}
                            </div>
                          </div>
                          <div className="progress">
                            <div className="progress-bar" style={{ width:`${pct}%`, background: pct>80?'#e63946':pct>50?'#fb8500':'var(--t-accent)' }} />
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--t-muted)' }}>
                            <span>{used} {t('profile.used')}</span><span>{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">{t('profile.myLeaveRequests')}</span></div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th>{t('profile.type')}</th>
                      <th>{t('profile.from')}</th>
                      <th>{t('profile.to')}</th>
                      <th>{t('profile.days')}</th>
                      <th>{t('profile.status')}</th>
                      <th>{t('profile.reason')}</th>
                    </tr></thead>
                    <tbody>
                      {leaveData.requests.length === 0 ? (
                        <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">{t('profile.noLeaveRequests')}</div></div></td></tr>
                      ) : leaveData.requests.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:500 }}>{r.leave_type_name}</td>
                          <td className="text-muted">{r.start_date}</td>
                          <td className="text-muted">{r.end_date}</td>
                          <td><span className="badge badge-info">{r.days}d</span></td>
                          <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>{r.status}</span></td>
                          <td className="text-muted" style={{ maxWidth:160, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {tab === 'security' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card">
                <div className="card-header">
                  <div>
                    <span className="card-title">{t('profile.changePassword')}</span>
                    <div className="text-muted" style={{ fontSize:12, marginTop:2 }}>{t('profile.strengthPassword')}</div>
                  </div>
                </div>
                <div style={{ padding:'20px', maxWidth:440 }}>
                  {pwError && (
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:8, alignItems:'center' }}>
                      <ion-icon name="alert-circle-outline" style={{ color:'#e63946', fontSize:16, flexShrink:0 }} />
                      <span style={{ fontSize:13, color:'#e63946' }}>{pwError}</span>
                    </div>
                  )}
                  {pwSuccess && (
                    <div style={{ background:'#f0faf2', border:'1px solid #b7e4c7', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:8, alignItems:'center' }}>
                      <ion-icon name="checkmark-circle-outline" style={{ color:'#40916c', fontSize:16, flexShrink:0 }} />
                      <span style={{ fontSize:13, color:'#40916c' }}>{pwSuccess}</span>
                    </div>
                  )}
                  <form onSubmit={changePw}>
                    <div className="form-group">
                      <label className="form-label">{t('profile.currentPassword')} *</label>
                      <input type="password" className="form-control" required value={pwForm.old_password} onChange={e => setPwForm(p=>({...p, old_password:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('profile.newPassword')} *</label>
                      <input type="password" className="form-control" required minLength={6} value={pwForm.new_password} onChange={e => setPwForm(p=>({...p, new_password:e.target.value}))} />
                      <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:4 }}>{t('profile.minimum6')}</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('profile.confirmNewPassword')} *</label>
                      <input type="password" className="form-control" required minLength={6} value={pwForm.confirm_password} onChange={e => setPwForm(p=>({...p, confirm_password:e.target.value}))} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={pwLoading} style={{ width:'100%', marginTop:8 }}>
                      {pwLoading ? t('profile.updating') : t('profile.updatePassword')}
                    </button>
                  </form>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">{t('profile.accountSecurity')}</span></div>
                <div style={{ padding:'16px 20px' }}>
                  {[
                    { icon:'lock-closed-outline',    label: t('profile.password'),     desc: t('profile.lastChanged'),  status: t('profile.enabled'),   ok:true  },
                    { icon:'phone-portrait-outline', label: t('profile.twoFA'),         desc: t('profile.protect2FA'),   status: t('profile.notSetUp'),  ok:false },
                    { icon:'eye-off-outline',        label: t('profile.loginHistory'),  desc: t('profile.viewDevices'),  status: t('profile.available'), ok:true  },
                  ].map(item => (
                    <div key={item.label} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid var(--t-border)', alignItems:'center' }}>
                      <div style={{ width:40, height:40, borderRadius:10, background: item.ok ? '#f0faf2' : '#fff7ed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <ion-icon name={item.icon} style={{ fontSize:20, color: item.ok ? '#40916c' : '#fb8500' }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>{item.label}</div>
                        <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>{item.desc}</div>
                      </div>
                      <span className={`badge ${item.ok ? 'badge-success' : 'badge-warning'}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LeaveAllocations({ allocs = [] }) {
  const { t } = useLang()
  if (allocs.length === 0) return null
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">{t('profile.leaveBalanceSummary')}</span></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12, padding:20 }}>
        {allocs.map(a => {
          const remaining = Math.max(0, (a.total_days||0) - (a.used_days||0))
          const pct = a.total_days > 0 ? Math.round(((a.used_days||0) / a.total_days) * 100) : 0
          return (
            <div key={a.id} style={{ border:'1px solid var(--t-border)', borderRadius:12, padding:16, textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:800, color: remaining>2?'#40916c':'#e63946', lineHeight:1 }}>{remaining}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--t-text)', margin:'6px 0 8px' }}>{a.leave_type_name}</div>
              <div className="progress" style={{ height:6 }}>
                <div className="progress-bar" style={{ width:`${pct}%`, background: pct>80?'#e63946':'var(--t-accent)' }} />
              </div>
              <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:6 }}>{a.used_days||0} / {a.total_days} {t('profile.used')}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
