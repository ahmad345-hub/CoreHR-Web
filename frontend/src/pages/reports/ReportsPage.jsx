import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line, PolarArea } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useLang } from '../../context/LanguageContext'
import api from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler)

const CHART_COLORS = ['#40916c','#52b788','#74c69d','#1b4332','#95d5b2','#b7e4c7','#6f42c1','#0dcaf0','#fd7e14','#dc3545']

const chartOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } },
}

export default function ReportsPage() {
  const { t } = useLang()
  const [tab, setTab] = useState('headcount')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2,'0'))
  const [year, setYear] = useState(String(new Date().getFullYear()))

  useEffect(() => {
    setLoading(true)
    setData(null)
    const endpoints = {
      headcount:   '/reports/headcount',
      attendance:  `/reports/attendance?month=${month}&year=${year}`,
      leave:       '/reports/leave',
      payroll:     '/reports/payroll',
      recruitment: '/reports/recruitment',
    }
    api.get(endpoints[tab]).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [tab, month, year])

  const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const YEARS = ['2022','2023','2024','2025','2026','2027']

  const tabs = [
    { key: 'headcount',   label: t('reports.tabHeadcount')   },
    { key: 'attendance',  label: t('reports.tabAttendance')  },
    { key: 'leave',       label: t('reports.tabLeave')       },
    { key: 'payroll',     label: t('reports.tabPayroll')     },
    { key: 'recruitment', label: t('reports.tabRecruitment') },
  ]

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('pages.reports.title')}</h1>
          <p className="page-subtitle">{t('reports.subtitle')}</p>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(({ key, label }) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Attendance filter */}
      {tab === 'attendance' && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-body" style={{ padding:'12px 20px' }}>
            <div className="search-row">
              <select className="form-control form-select" style={{ maxWidth:140 }} value={month} onChange={e => setMonth(e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
              </select>
              <select className="form-control form-select" style={{ maxWidth:110 }} value={year} onChange={e => setYear(e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div style={{ textAlign:'center', padding:60 }}><div className="spinner" style={{ margin:'0 auto' }} /></div></div>
      ) : !data || data.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">{t('reports.noDataAvailable')}</div></div></div>
      ) : (
        <>
          {/* ── Headcount ──────────────────────────────────────────── */}
          {tab === 'headcount' && (
            <>
              <div className="grid-2" style={{ marginBottom:20 }}>
                <div className="card">
                  <div className="card-header"><span className="card-title">{t('reports.employeesByDepartment')}</span></div>
                  <div className="card-body" style={{ padding:20, height:280 }}>
                    <Bar
                      data={{
                        labels: data.map(d => d.department),
                        datasets: [
                          { label: t('reports.male'), data: data.map(d => d.male || 0), backgroundColor: '#2d6a4f', borderRadius: 6 },
                          { label: t('reports.female'), data: data.map(d => d.female || 0), backgroundColor: '#74c69d', borderRadius: 6 },
                        ],
                      }}
                      options={{ ...chartOpts, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' } } }}
                    />
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><span className="card-title">{t('reports.genderDistribution')}</span></div>
                  <div className="card-body" style={{ padding:20, height:280, display:'flex', justifyContent:'center' }}>
                    <Doughnut
                      data={{
                        labels: [t('reports.male'), t('reports.female')],
                        datasets: [{ data: [data.reduce((s,d)=>s+(d.male||0),0), data.reduce((s,d)=>s+(d.female||0),0)], backgroundColor: ['#2d6a4f','#74c69d'], borderWidth: 3, borderColor: '#fff' }],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                    />
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th>{t('reports.department')}</th>
                      <th>{t('reports.total')}</th>
                      <th>{t('reports.male')}</th>
                      <th>{t('reports.female')}</th>
                      <th>{t('reports.distribution')}</th>
                    </tr></thead>
                    <tbody>
                      {data.map(d => {
                        const grandTotal = data.reduce((s, x) => s + x.total, 0)
                        const pct = grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0
                        return (
                          <tr key={d.department}>
                            <td style={{ fontWeight:500 }}>{d.department}</td>
                            <td><span className="badge badge-info">{d.total}</span></td>
                            <td className="text-muted">{d.male || 0}</td>
                            <td className="text-muted">{d.female || 0}</td>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:120 }}>
                                <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${pct}%` }} /></div>
                                <span style={{ fontSize:12, minWidth:32 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      <tr style={{ fontWeight:700 }}>
                        <td>{t('reports.total')}</td>
                        <td><span className="badge badge-success">{data.reduce((s,d)=>s+d.total,0)}</span></td>
                        <td>{data.reduce((s,d)=>s+(d.male||0),0)}</td>
                        <td>{data.reduce((s,d)=>s+(d.female||0),0)}</td>
                        <td>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Attendance ─────────────────────────────────────────── */}
          {tab === 'attendance' && (
            <>
            <div className="grid-2" style={{ marginBottom:20 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">{t('reports.attendanceByEmployee')}</span></div>
                <div className="card-body" style={{ padding:20, height:280 }}>
                  <Bar
                    data={{
                      labels: data.filter(d=>d.days_present>0).slice(0,10).map(d => d.employee?.split(' ')[0]),
                      datasets: [{ data: data.filter(d=>d.days_present>0).slice(0,10).map(d => d.days_present), backgroundColor: '#40916c', borderRadius: 6, label: t('reports.daysPresent') }],
                    }}
                    options={{ ...chartOpts, indexAxis: 'y', maintainAspectRatio: false }}
                  />
                </div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">{t('reports.hoursDistribution')}</span></div>
                <div className="card-body" style={{ padding:20, height:280 }}>
                  <Line
                    data={{
                      labels: data.filter(d=>d.total_hours>0).slice(0,10).map(d => d.employee?.split(' ')[0]),
                      datasets: [{
                        data: data.filter(d=>d.total_hours>0).slice(0,10).map(d => d.avg_hours),
                        borderColor: '#40916c', backgroundColor: 'rgba(64,145,108,0.1)',
                        fill: true, tension: 0.4, label: t('reports.avgHours'),
                      }],
                    }}
                    options={{ ...chartOpts, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr>
                    <th>{t('reports.employee')}</th>
                    <th>{t('reports.department')}</th>
                    <th>{t('reports.daysPresent')}</th>
                    <th>{t('reports.avgHours')}</th>
                    <th>{t('reports.totalHours')}</th>
                  </tr></thead>
                  <tbody>
                    {data.map(d => (
                      <tr key={d.employee}>
                        <td style={{ fontWeight:500 }}>{d.employee}</td>
                        <td className="text-muted">{d.department || '—'}</td>
                        <td><span className="badge badge-info">{d.days_present || 0}</span></td>
                        <td>{d.avg_hours ? `${d.avg_hours}h` : '—'}</td>
                        <td style={{ fontWeight:600 }}>{d.total_hours ? `${d.total_hours}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {/* ── Leave ──────────────────────────────────────────────── */}
          {tab === 'leave' && (
            <>
            {(() => {
              const withData = data.filter(d => d.requests > 0)
              const approved = withData.reduce((s,d) => s + (d.approved_days||0), 0)
              const rejected = withData.reduce((s,d) => s + (d.rejected||0), 0)
              const pending = withData.reduce((s,d) => s + d.requests, 0) - approved - rejected
              const byType = {}
              withData.forEach(d => { if(d.leave_type) byType[d.leave_type] = (byType[d.leave_type]||0) + (d.approved_days||0) })
              return (
                <div className="grid-2" style={{ marginBottom:20 }}>
                  <div className="card">
                    <div className="card-header"><span className="card-title">{t('reports.leaveOverview')}</span></div>
                    <div className="card-body" style={{ padding:20, height:260, display:'flex', justifyContent:'center' }}>
                      <Doughnut
                        data={{ labels: [t('reports.approvedDays'), t('reports.rejected'), t('reports.pending')], datasets: [{ data: [approved, rejected, Math.max(0,pending)], backgroundColor: ['#40916c','#dc3545','#f59e0b'], borderWidth: 3, borderColor: '#fff' }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                      />
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header"><span className="card-title">{t('reports.leaveByType')}</span></div>
                    <div className="card-body" style={{ padding:20, height:260 }}>
                      <Bar data={{ labels: Object.keys(byType), datasets: [{ data: Object.values(byType), backgroundColor: CHART_COLORS, borderRadius: 6 }] }}
                        options={{ ...chartOpts, maintainAspectRatio: false }} />
                    </div>
                  </div>
                </div>
              )
            })()}
            <div className="card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr>
                    <th>{t('reports.employee')}</th>
                    <th>{t('reports.department')}</th>
                    <th>{t('reports.leaveType')}</th>
                    <th>{t('reports.requests')}</th>
                    <th>{t('reports.approvedDays')}</th>
                    <th>{t('reports.rejected')}</th>
                  </tr></thead>
                  <tbody>
                    {data.filter(d => d.requests > 0).map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight:500 }}>{d.employee}</td>
                        <td className="text-muted">{d.department || '—'}</td>
                        <td>{d.leave_type || '—'}</td>
                        <td><span className="badge badge-info">{d.requests}</span></td>
                        <td><span className="badge badge-success">{d.approved_days || 0}d</span></td>
                        <td>{d.rejected > 0 ? <span className="badge badge-danger">{d.rejected}</span> : <span className="text-muted">0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {/* ── Payroll ────────────────────────────────────────────── */}
          {tab === 'payroll' && (
            <>
              <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
                <div className="stat-card stat-card--success">
                  <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="people-outline" /></div></div>
                  <div className="stat-card-count">{data.length}</div>
                  <div className="stat-card-label">{t('reports.employeesPaid')}</div>
                </div>
                <div className="stat-card stat-card--info">
                  <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="cash-outline" /></div></div>
                  <div className="stat-card-count">${(data.reduce((s,d)=>s+(d.total_basic||0),0)/1000).toFixed(0)}K</div>
                  <div className="stat-card-label">{t('reports.totalBasic')}</div>
                </div>
                <div className="stat-card stat-card--warning">
                  <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="add-circle-outline" /></div></div>
                  <div className="stat-card-count">${(data.reduce((s,d)=>s+(d.total_allowances||0),0)/1000).toFixed(0)}K</div>
                  <div className="stat-card-label">{t('reports.allowances')}</div>
                </div>
                <div className="stat-card stat-card--success">
                  <div className="stat-card-header"><div className="stat-card-icon"><ion-icon name="trending-up-outline" /></div></div>
                  <div className="stat-card-count">${(data.reduce((s,d)=>s+(d.total_net||0),0)/1000).toFixed(0)}K</div>
                  <div className="stat-card-label">{t('reports.netPay')}</div>
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom:20 }}>
                <div className="card">
                  <div className="card-header"><span className="card-title">{t('reports.payrollByDepartment')}</span></div>
                  <div className="card-body" style={{ padding:20, height:260 }}>
                    {(() => {
                      const byDept = {}
                      data.forEach(d => { const dept = d.department || 'Other'; byDept[dept] = (byDept[dept]||0) + (d.total_net||0) })
                      return <Bar data={{ labels: Object.keys(byDept), datasets: [{ data: Object.values(byDept).map(v => Math.round(v/1000)), backgroundColor: CHART_COLORS, borderRadius: 6, label: 'Net Pay ($K)' }] }}
                        options={{ ...chartOpts, maintainAspectRatio: false }} />
                    })()}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><span className="card-title">{t('reports.payBreakdown')}</span></div>
                  <div className="card-body" style={{ padding:20, height:260, display:'flex', justifyContent:'center' }}>
                    <Doughnut data={{
                      labels: [t('reports.totalBasic'), t('reports.allowances'), t('reports.deductions')],
                      datasets: [{ data: [data.reduce((s,d)=>s+(d.total_basic||0),0), data.reduce((s,d)=>s+(d.total_allowances||0),0), data.reduce((s,d)=>s+(d.total_deductions||0),0)], backgroundColor: ['#2d6a4f','#52b788','#dc3545'], borderWidth: 3, borderColor: '#fff' }],
                    }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th>{t('reports.employee')}</th>
                      <th>{t('reports.department')}</th>
                      <th>{t('reports.payslips')}</th>
                      <th>{t('reports.totalBasic')}</th>
                      <th>{t('reports.allowances')}</th>
                      <th>{t('reports.deductions')}</th>
                      <th>{t('reports.netPay')}</th>
                    </tr></thead>
                    <tbody>
                      {data.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:500 }}>{d.employee}</td>
                          <td className="text-muted">{d.department || '—'}</td>
                          <td className="text-muted">{d.payslip_count || 0}</td>
                          <td>${Number(d.total_basic || 0).toLocaleString()}</td>
                          <td style={{ color:'var(--t-accent)' }}>+${Number(d.total_allowances || 0).toLocaleString()}</td>
                          <td style={{ color:'#ef4444' }}>-${Number(d.total_deductions || 0).toLocaleString()}</td>
                          <td style={{ fontWeight:600 }}>${Number(d.total_net || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Recruitment ────────────────────────────────────────── */}
          {tab === 'recruitment' && (
            <>
              <div className="grid-2" style={{ marginBottom:20 }}>
                <div className="card">
                  <div className="card-header"><span className="card-title">{t('reports.recruitmentFunnel')}</span></div>
                  <div className="card-body" style={{ height:260, padding:20 }}>
                    <Doughnut
                      data={{
                        labels: [t('reports.hired'), t('reports.inPipeline'), t('reports.rejected')],
                        datasets: [{
                          data: [
                            data.reduce((s,d)=>s+(d.hired||0),0),
                            data.reduce((s,d)=>s+(d.in_pipeline||0),0),
                            data.reduce((s,d)=>s+(d.rejected||0),0),
                          ],
                          backgroundColor: ['#40916c','#0dcaf0','#dc3545'],
                          borderWidth: 2,
                        }],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                    />
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><span className="card-title">{t('reports.summary')}</span></div>
                  <div className="card-body" style={{ padding:20 }}>
                    <div className="stat-grid" style={{ gridTemplateColumns:'repeat(2,1fr)' }}>
                      <div className="stat-card stat-card--success" style={{ padding:16 }}>
                        <div className="stat-card-count">{data.reduce((s,d)=>s+(d.total_candidates||0),0)}</div>
                        <div className="stat-card-label">{t('reports.totalCandidates')}</div>
                      </div>
                      <div className="stat-card stat-card--success" style={{ padding:16 }}>
                        <div className="stat-card-count">{data.reduce((s,d)=>s+(d.hired||0),0)}</div>
                        <div className="stat-card-label">{t('reports.hired')}</div>
                      </div>
                      <div className="stat-card stat-card--info" style={{ padding:16 }}>
                        <div className="stat-card-count">{data.reduce((s,d)=>s+(d.in_pipeline||0),0)}</div>
                        <div className="stat-card-label">{t('reports.inPipeline')}</div>
                      </div>
                      <div className="stat-card stat-card--danger" style={{ padding:16 }}>
                        <div className="stat-card-count">{data.reduce((s,d)=>s+(d.rejected||0),0)}</div>
                        <div className="stat-card-label">{t('reports.rejected')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th>{t('reports.position')}</th>
                      <th>{t('reports.totalCandidates')}</th>
                      <th>{t('reports.hired')}</th>
                      <th>{t('reports.inPipeline')}</th>
                      <th>{t('reports.rejected')}</th>
                      <th>{t('reports.hireRate')}</th>
                    </tr></thead>
                    <tbody>
                      {data.map(d => {
                        const rate = d.total_candidates > 0 ? Math.round((d.hired / d.total_candidates) * 100) : 0
                        return (
                          <tr key={d.position}>
                            <td style={{ fontWeight:500 }}>{d.position}</td>
                            <td><span className="badge badge-info">{d.total_candidates}</span></td>
                            <td><span className="badge badge-success">{d.hired || 0}</span></td>
                            <td><span className="badge badge-warning">{d.in_pipeline || 0}</span></td>
                            <td><span className="badge badge-danger">{d.rejected || 0}</span></td>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:100 }}>
                                <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${rate}%` }} /></div>
                                <span style={{ fontSize:12 }}>{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
