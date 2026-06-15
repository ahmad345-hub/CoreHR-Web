import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerms } from '../../hooks/usePerms'
import { useLang } from '../../context/LanguageContext'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import api from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const STATUS_BADGE = { draft: 'badge-warning', confirmed: 'badge-info', paid: 'badge-success' }

export default function PayrollPage() {
  const { user } = useAuth()
  const { t } = useLang()
  const { can } = usePerms()
  const [tab, setTab]       = useState('payslips')
  const [payslips, setPayslips] = useState([])
  const [contracts, setContracts] = useState([])
  const [allowances, setAllowances] = useState([])
  const [deductions, setDeductions] = useState([])
  const [summary, setSummary] = useState(null)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchPayslips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (filterStatus) params.append('status', filterStatus)
      const [ps, sum] = await Promise.all([
        api.get(`/payroll/payslips?${params}`),
        api.get('/payroll/summary'),
      ])
      setPayslips(ps.data.results)
      setTotal(ps.data.total)
      setPages(ps.data.pages)
      setSummary(sum.data)
    } finally { setLoading(false) }
  }, [page, filterStatus])

  useEffect(() => { if (tab === 'payslips') fetchPayslips() }, [tab, fetchPayslips])

  useEffect(() => {
    if (tab === 'contracts') api.get('/payroll/contracts').then(r => setContracts(r.data)).finally(() => setLoading(false))
    if (tab === 'allowances') {
      Promise.all([api.get('/payroll/allowances'), api.get('/payroll/deductions')]).then(([a, d]) => { setAllowances(a.data); setDeductions(d.data) }).finally(() => setLoading(false))
    }
  }, [tab])

  const confirmPayslip = async id => { await api.put(`/payroll/payslips/${id}/confirm`); fetchPayslips() }
  const markPaid = async id => { await api.put(`/payroll/payslips/${id}/pay`); fetchPayslips() }

  const statusLabel = s => {
    const map = { draft: t('payroll.draft'), confirmed: t('payroll.confirmed'), paid: t('payroll.paid') }
    return map[s] || s
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.payroll.title')}</h1>
          <p className="page-subtitle">{t('payroll.subtitle')}</p>
        </div>
      </div>

      {/* Summary */}
      {summary && tab === 'payslips' && can('payroll.manage') && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          <div className="stat-card stat-card--success">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="cash-outline" /></div></div>
            <div className="stat-card-count">${(summary.total_paid / 1000).toFixed(0)}K</div>
            <div className="stat-card-label">{t('payroll.totalPaid')}</div>
          </div>
          <div className="stat-card stat-card--warning">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="time-outline" /></div></div>
            <div className="stat-card-count">${(summary.total_pending / 1000).toFixed(0)}K</div>
            <div className="stat-card-label">{t('payroll.pending')}</div>
          </div>
          <div className="stat-card stat-card--info">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="document-outline" /></div></div>
            <div className="stat-card-count">{summary.total_payslips}</div>
            <div className="stat-card-label">{t('payroll.totalPayslips')}</div>
          </div>
          <div className="stat-card stat-card--success">
            <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="trending-up-outline" /></div></div>
            <div className="stat-card-count">${(summary.total_net / 1000).toFixed(0)}K</div>
            <div className="stat-card-label">{t('payroll.totalNetPay')}</div>
          </div>
        </div>
      )}

      {/* Payroll Charts */}
      {can('payroll.manage') && payslips.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('payroll.statusBreakdown')}</span></div>
            <div className="card-body" style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: [t('payroll.paid'), t('payroll.confirmed'), t('payroll.draft')],
                  datasets: [{ data: [payslips.filter(p=>p.status==='paid').length, payslips.filter(p=>p.status==='confirmed').length, payslips.filter(p=>p.status==='draft').length], backgroundColor: ['#40916c','#0dcaf0','#f59e0b'], borderWidth: 2, borderColor: '#fff' }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('payroll.topSalaries')}</span></div>
            <div className="card-body" style={{ height: 200 }}>
              {(() => {
                const top = [...payslips].filter(p=>p.status==='paid').sort((a,b)=>(b.net_pay||0)-(a.net_pay||0)).slice(0,6)
                return <Bar data={{ labels: top.map(p=>p.employee_name?.split(' ')[0] || '?'), datasets: [{ data: top.map(p=>p.net_pay), backgroundColor: '#40916c', borderRadius: 6 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } } }} />
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'payslips' ? 'active' : ''}`} onClick={() => setTab('payslips')}>{t('payroll.payslips')}</button>
        {can('payroll.manage') && (
          <button className={`tab ${tab === 'contracts' ? 'active' : ''}`} onClick={() => setTab('contracts')}>{t('payroll.contracts')}</button>
        )}
        {can('payroll.manage') && (
          <button className={`tab ${tab === 'allowances' ? 'active' : ''}`} onClick={() => setTab('allowances')}>{t('payroll.allowancesDeductions')}</button>
        )}
      </div>

      {/* Payslips */}
      {tab === 'payslips' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              <div className="search-row">
                <select className="form-control form-select" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                  <option value="">{t('payroll.allStatus')}</option>
                  <option value="draft">{t('payroll.draft')}</option>
                  <option value="confirmed">{t('payroll.confirmed')}</option>
                  <option value="paid">{t('payroll.paid')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>{t('payroll.employee')}</th>
                  <th>{t('payroll.department')}</th>
                  <th>{t('payroll.period')}</th>
                  <th>{t('payroll.basicPay')}</th>
                  <th>{t('payroll.allowances')}</th>
                  <th>{t('payroll.deductions')}</th>
                  <th>{t('payroll.netPay')}</th>
                  <th>{t('payroll.status')}</th>
                  <th>{t('payroll.actions')}</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                  ) : payslips.length === 0 ? (
                    <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-title">{t('payroll.noPayslipsFound')}</div></div></td></tr>
                  ) : payslips.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight:500 }}>{p.employee_name}</td>
                      <td className="text-muted">{p.department_name || '—'}</td>
                      <td className="text-muted">{p.period_start?.slice(0,7)}</td>
                      <td>${Number(p.basic_pay).toLocaleString()}</td>
                      <td style={{ color: 'var(--t-accent)' }}>+${Number(p.allowances).toLocaleString()}</td>
                      <td style={{ color: '#ef4444' }}>-${Number(p.deductions).toLocaleString()}</td>
                      <td style={{ fontWeight:600 }}>${Number(p.net_pay).toLocaleString()}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-neutral'}`}>{statusLabel(p.status)}</span></td>
                      <td>
                        {can('payroll.manage') && (
                        <div className="table-actions">
                          {p.status === 'draft' && <button className="btn btn-sm btn-secondary" onClick={() => confirmPayslip(p.id)}>{t('payroll.confirm')}</button>}
                          {p.status === 'confirmed' && <button className="btn btn-sm btn-success" onClick={() => markPaid(p.id)}>{t('payroll.markPaid')}</button>}
                        </div>
                        )}
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

      {/* Contracts */}
      {tab === 'contracts' && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t('payroll.employee')}</th>
                <th>{t('payroll.type')}</th>
                <th>{t('payroll.startDate')}</th>
                <th>{t('payroll.endDate')}</th>
                <th>{t('payroll.wage')}</th>
                <th>{t('payroll.frequency')}</th>
                <th>{t('payroll.status')}</th>
              </tr></thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:500 }}>{c.employee_name}</td>
                    <td style={{ textTransform:'capitalize' }}>{c.contract_type}</td>
                    <td>{c.start_date}</td>
                    <td>{c.end_date || '—'}</td>
                    <td>${Number(c.wage).toLocaleString()}</td>
                    <td style={{ textTransform:'capitalize' }}>{c.pay_frequency}</td>
                    <td><span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allowances & Deductions */}
      {tab === 'allowances' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('payroll.allowances')}</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>{t('payroll.name')}</th><th>{t('payroll.amount')}</th><th>{t('payroll.type')}</th></tr></thead>
                <tbody>
                  {allowances.map(a => (
                    <tr key={a.id}><td>{a.name}</td><td>{a.is_percent ? `${a.amount}%` : `$${a.amount}`}</td><td><span className={`badge ${a.is_percent ? 'badge-info' : 'badge-success'}`}>{a.is_percent ? t('payroll.percentage') : t('payroll.fixed')}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{t('payroll.deductions')}</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>{t('payroll.name')}</th><th>{t('payroll.amount')}</th><th>{t('payroll.type')}</th></tr></thead>
                <tbody>
                  {deductions.map(d => (
                    <tr key={d.id}><td>{d.name}</td><td>{d.is_percent ? `${d.amount}%` : `$${d.amount}`}</td><td><span className={`badge ${d.is_percent ? 'badge-info' : 'badge-danger'}`}>{d.is_percent ? t('payroll.percentage') : t('payroll.fixed')}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
