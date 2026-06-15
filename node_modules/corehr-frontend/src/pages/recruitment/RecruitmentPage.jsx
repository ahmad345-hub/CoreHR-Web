import { useState, useEffect, useCallback, useRef } from 'react'
import { useLang } from '../../context/LanguageContext'
import { usePerms } from '../../hooks/usePerms'
import api from '../../api/client'

const STATUS_BADGE = { active: 'badge-info', hired: 'badge-success', rejected: 'badge-danger', withdrawn: 'badge-neutral' }

export default function RecruitmentPage() {
  const { t } = useLang()
  const { can } = usePerms()
  const [tab, setTab]             = useState('pipeline')
  const [pipeline, setPipeline]   = useState([])
  const [postings, setPostings]   = useState([])
  const [candidates, setCandidates] = useState([])
  const [stages, setStages]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCandModal, setShowCandModal] = useState(false)
  const [candForm, setCandForm]   = useState({ name:'', email:'', phone:'', posting_id:'', stage_id:'', note:'', skills:'' })
  const [filters, setFilters]     = useState({ search:'', posting_id:'', stage_id:'', status:'', skills:'' })

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    const [pipe, posts, stgs] = await Promise.all([
      api.get('/recruitment/pipeline'),
      api.get('/recruitment/postings'),
      api.get('/recruitment/stages'),
    ])
    setPipeline(pipe.data)
    setPostings(posts.data)
    setStages(stgs.data)
    setLoading(false)
  }, [])

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.search)     params.append('search', filters.search)
    if (filters.posting_id) params.append('posting_id', filters.posting_id)
    if (filters.stage_id)   params.append('stage_id', filters.stage_id)
    if (filters.status)     params.append('status', filters.status)
    if (filters.skills)     params.append('skills', filters.skills)
    const res = await api.get(`/recruitment/candidates?${params}`)
    setCandidates(res.data)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    if (tab === 'pipeline' || tab === 'postings') fetchPipeline()
    if (tab === 'candidates') fetchCandidates()
  }, [tab, fetchPipeline, fetchCandidates, filters])

  const fileInputRef = useRef(null)
  const [uploadingId, setUploadingId] = useState(null)
  const [parsingId, setParsingId]     = useState(null)

  const handleCVUpload = async (candidateId, file) => {
    setUploadingId(candidateId)
    try {
      const formData = new FormData()
      formData.append('cv', file)
      const res = await api.post(`/recruitment/candidates/${candidateId}/cv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fetchCandidates()
      if (res.data.parsed) {
        const p = res.data.parsed
        const msg = [
          'CV parsed successfully!',
          p.name   && `Name: ${p.name}`,
          p.email  && `Email: ${p.email}`,
          p.phone  && `Phone: ${p.phone}`,
          p.skills && `Skills: ${p.skills}`,
        ].filter(Boolean).join('\n')
        alert(msg)
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  const handleReparse = async candidateId => {
    setParsingId(candidateId)
    try {
      const res = await api.post(`/recruitment/candidates/${candidateId}/parse`)
      fetchCandidates()
      if (res.data.parsed) {
        const p = res.data.parsed
        const msg = ['CV parsed successfully!',
          p.name   && `Name: ${p.name}`,
          p.email  && `Email: ${p.email}`,
          p.phone  && `Phone: ${p.phone}`,
          p.skills && `Skills: ${p.skills}`,
        ].filter(Boolean).join('\n')
        alert(msg)
      } else {
        alert('Could not extract data from this CV.')
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Parse failed')
    } finally {
      setParsingId(null)
    }
  }

  const moveCandidate = async (id, stageId) => {
    await api.put(`/recruitment/candidates/${id}/move`, { stage_id: stageId })
    fetchPipeline()
  }

  const hireCandidate = async id => {
    await api.put(`/recruitment/candidates/${id}/hire`)
    fetchPipeline()
  }

  const addCandidate = async e => {
    e.preventDefault()
    await api.post('/recruitment/candidates', candForm)
    setShowCandModal(false)
    setCandForm({ name:'', email:'', phone:'', posting_id:'', stage_id:'', note:'' })
    fetchPipeline()
  }

  const statusLabel = s => {
    const map = { active: 'Active', hired: 'Hired', rejected: t('leave.rejected'), withdrawn: 'Withdrawn' }
    return map[s] || s
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.recruitment.title')}</h1>
          <p className="page-subtitle">{t('recruitment.subtitle')}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCandModal(true)}>
            <ion-icon name="person-add-outline" /> {t('recruitment.addCandidate')}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'pipeline' ? 'active' : ''}`} onClick={() => setTab('pipeline')}>{t('recruitment.kanbanPipeline')}</button>
        <button className={`tab ${tab === 'candidates' ? 'active' : ''}`} onClick={() => setTab('candidates')}>{t('recruitment.allCandidates')}</button>
        <button className={`tab ${tab === 'postings' ? 'active' : ''}`} onClick={() => setTab('postings')}>{t('recruitment.jobPostings')}</button>
      </div>

      {/* Kanban Pipeline */}
      {tab === 'pipeline' && (
        loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
          <div className="kanban-board">
            {pipeline.map(stage => (
              <div className="kanban-col" key={stage.id}>
                <div className="kanban-col-header">
                  <span className="kanban-col-title">{stage.name}</span>
                  <span className="kanban-col-count">{stage.candidates.length}</span>
                </div>
                {stage.candidates.map(c => (
                  <div className="kanban-card" key={c.id}>
                    <div className="kanban-card-title">{c.name}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--t-muted)', marginBottom: 8 }}>
                      {c.posting_title}
                    </div>
                    <div className="kanban-card-meta">
                      <span className={`badge ${STATUS_BADGE[c.status] || 'badge-neutral'}`}>{statusLabel(c.status)}</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select
                          className="form-control form-select"
                          style={{ fontSize: '0.7rem', padding: '2px 6px', height: 'auto', width: 'auto' }}
                          value=""
                          onChange={e => e.target.value && moveCandidate(c.id, Number(e.target.value))}
                          title="Move to stage"
                        >
                          <option value="">→ Move</option>
                          {stages.filter(s => s.id !== stage.id).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        {stage.name === 'Offer' && (
                          <button className="btn btn-sm btn-success" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => hireCandidate(c.id)}>{t('recruitment.hire')}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stage.candidates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t-muted)', fontSize: '0.78rem' }}>{t('recruitment.noCandidates')}</div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* All Candidates */}
      {tab === 'candidates' && (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '14px 20px' }}>
              <div className="search-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <input
                  className="form-control"
                  placeholder="Search name, email, phone…"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  style={{ minWidth: 180 }}
                />
                <input
                  className="form-control"
                  placeholder="Filter by skill (e.g. React, SQL…)"
                  value={filters.skills}
                  onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                  style={{ minWidth: 180 }}
                />
                <select className="form-control form-select" style={{ maxWidth: 180 }} value={filters.posting_id} onChange={e => setFilters(f => ({ ...f, posting_id: e.target.value }))}>
                  <option value="">All Positions</option>
                  {postings.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <select className="form-control form-select" style={{ maxWidth: 160 }} value={filters.stage_id} onChange={e => setFilters(f => ({ ...f, stage_id: e.target.value }))}>
                  <option value="">All Stages</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="form-control form-select" style={{ maxWidth: 140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                {(filters.search || filters.skills || filters.posting_id || filters.stage_id || filters.status) && (
                  <button className="btn btn-secondary" onClick={() => setFilters({ search:'', posting_id:'', stage_id:'', status:'', skills:'' })}>
                    Clear
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--t-muted)', marginTop: 8 }}>
                {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>{t('recruitment.name')}</th>
                  <th>{t('recruitment.email')}</th>
                  <th>Skills</th>
                  <th>{t('recruitment.position')}</th>
                  <th>{t('recruitment.stage')}</th>
                  <th>{t('recruitment.status')}</th>
                  <th>{t('recruitment.applied')}</th>
                  <th>CV</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                  ) : candidates.length === 0 ? (
                    <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">💼</div><div className="empty-state-title">{t('recruitment.noCandidatesYet')}</div></div></td></tr>
                  ) : candidates.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight:500 }}>{c.name}</td>
                      <td>{c.email || '—'}</td>
                      <td>
                        {c.skills ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {c.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                              <span key={s} className="badge badge-info" style={{ fontSize:'0.7rem' }}>{s}</span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td>{c.posting_title || '—'}</td>
                      <td>{c.stage_name || '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-neutral'}`}>{statusLabel(c.status)}</span></td>
                      <td className="text-muted">{c.created_at?.slice(0,10)}</td>
                      <td>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          {c.resume_url && (
                            <a
                              href={`http://localhost:5000${c.resume_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-secondary"
                              title="Download CV"
                            >
                              <ion-icon name="download-outline" />
                            </a>
                          )}
                          {c.resume_url && (
                            <button
                              className="btn btn-sm btn-primary"
                              title="Parse CV with SharpAPI"
                              disabled={parsingId === c.id}
                              onClick={() => handleReparse(c.id)}
                            >
                              {parsingId === c.id
                                ? <div className="spinner" style={{ width:12, height:12, borderWidth:2 }} />
                                : <ion-icon name="sparkles-outline" />
                              }
                            </button>
                          )}
                          <label className="btn btn-sm btn-secondary" title="Upload CV" style={{ cursor:'pointer', margin:0 }}>
                            {uploadingId === c.id
                              ? <div className="spinner" style={{ width:12, height:12, borderWidth:2 }} />
                              : <ion-icon name="cloud-upload-outline" />
                            }
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              style={{ display:'none' }}
                              onChange={e => e.target.files[0] && handleCVUpload(c.id, e.target.files[0])}
                            />
                          </label>
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

      {/* Job Postings */}
      {tab === 'postings' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('recruitment.position')}</th>
                <th>{t('recruitment.department')}</th>
                <th>{t('recruitment.vacancies')}</th>
                <th>{t('recruitment.candidates')}</th>
                <th>{t('recruitment.status')}</th>
                <th>{t('recruitment.closing')}</th>
              </tr></thead>
              <tbody>
                {postings.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:500 }}>{p.title}</td>
                    <td>{p.department_name || '—'}</td>
                    <td>{p.vacancies}</td>
                    <td><span className="badge badge-info">{p.candidate_count}</span></td>
                    <td><span className={`badge ${p.status === 'open' ? 'badge-success' : p.status === 'closed' ? 'badge-danger' : 'badge-neutral'}`}>{p.status}</span></td>
                    <td className="text-muted">{p.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showCandModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><span className="modal-title">{t('recruitment.addCandidate')}</span><button className="modal-close" onClick={() => setShowCandModal(false)}>✕</button></div>
            <form onSubmit={addCandidate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">{t('recruitment.fullName')} *</label><input className="form-control" required value={candForm.name} onChange={e => setCandForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">{t('recruitment.email')}</label><input type="email" className="form-control" value={candForm.email} onChange={e => setCandForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">{t('recruitment.phone')}</label><input className="form-control" value={candForm.phone} onChange={e => setCandForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">{t('recruitment.jobPosting')}</label>
                  <select className="form-control form-select" value={candForm.posting_id} onChange={e => setCandForm(f => ({ ...f, posting_id: e.target.value }))}>
                    <option value="">{t('common.select')}</option>
                    {postings.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">{t('recruitment.stage')}</label>
                  <select className="form-control form-select" value={candForm.stage_id} onChange={e => setCandForm(f => ({ ...f, stage_id: e.target.value }))}>
                    <option value="">{t('common.select')}</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Skills <span style={{ color:'var(--t-muted)', fontWeight:400 }}>(comma separated, e.g. React, SQL, Python)</span></label>
                  <input className="form-control" placeholder="React, Node.js, SQL…" value={candForm.skills} onChange={e => setCandForm(f => ({ ...f, skills: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">{t('recruitment.notes')}</label><textarea className="form-control" rows={2} value={candForm.note} onChange={e => setCandForm(f => ({ ...f, note: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCandModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('recruitment.addCandidate')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
