import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)

  const totalEmployees   = db.prepare('SELECT COUNT(*) as c FROM employees WHERE is_active = 1').get().c
  const newThisMonth     = db.prepare(`SELECT COUNT(*) as c FROM employees WHERE date_joining >= date('now','start of month')`).get().c
  const onLeaveToday     = db.prepare(`SELECT COUNT(*) as c FROM leave_requests WHERE start_date <= ? AND end_date >= ? AND status = 'approved'`).get(today, today).c
  const presentToday     = db.prepare(`SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'present'`).get(today).c
  const pendingLeaves    = db.prepare(`SELECT COUNT(*) as c FROM leave_requests WHERE status = 'pending'`).get().c
  const openPositions    = db.prepare(`SELECT SUM(vacancies) as c FROM job_postings WHERE status = 'open'`).get().c || 0
  const totalCandidates  = db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE status = 'active'`).get().c
  const openTickets      = db.prepare(`SELECT COUNT(*) as c FROM helpdesk_tickets WHERE status IN ('open','in_progress')`).get().c
  const activeProjects   = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE status = 'active'`).get().c
  const totalPayroll     = db.prepare(`SELECT SUM(net_pay) as s FROM payslips WHERE status = 'paid' AND period_start >= date('now','start of month')`).get().s || 0
  const draftPayslips    = db.prepare(`SELECT COUNT(*) as c FROM payslips WHERE status = 'draft'`).get().c
  const expiringContracts = db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= date('now', '+30 days')`).get().c

  res.json({
    total_employees: totalEmployees,
    new_this_month: newThisMonth,
    on_leave_today: onLeaveToday,
    present_today: presentToday,
    absent_today: Math.max(0, totalEmployees - presentToday - onLeaveToday),
    pending_leaves: pendingLeaves,
    open_positions: openPositions,
    total_candidates: totalCandidates,
    open_tickets: openTickets,
    active_projects: activeProjects,
    total_payroll_this_month: totalPayroll,
    draft_payslips: draftPayslips,
    expiring_contracts: expiringContracts,
  })
})

// Attendance trend (last 7 days)
router.get('/attendance-trend', (req, res) => {
  const rows = db.prepare(`
    SELECT date,
      COUNT(*) as present,
      SUM(worked_hours) as total_hours
    FROM attendance
    WHERE date >= date('now', '-7 days') AND status = 'present'
    GROUP BY date
    ORDER BY date ASC
  `).all()
  res.json(rows)
})

// Department distribution
router.get('/department-distribution', (req, res) => {
  const rows = db.prepare(`
    SELECT d.name, COUNT(e.id) as count
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = 1
    GROUP BY d.id, d.name
    ORDER BY count DESC
  `).all()
  res.json(rows)
})

// Leave overview (by type this year)
router.get('/leave-overview', (req, res) => {
  const rows = db.prepare(`
    SELECT lt.name, COUNT(lr.id) as requests,
      SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END) as days_approved
    FROM leave_types lt
    LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
      AND lr.start_date >= date('now', 'start of year')
    GROUP BY lt.id, lt.name
  `).all()
  res.json(rows)
})

// Recent activity (leave requests + new employees)
router.get('/recent-activity', (req, res) => {
  const leaves = db.prepare(`
    SELECT 'leave_request' as type, lr.created_at as time,
      u.first_name || ' ' || u.last_name as actor,
      lt.name || ' - ' || lr.status as detail
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    ORDER BY lr.created_at DESC LIMIT 5
  `).all()

  const newEmps = db.prepare(`
    SELECT 'new_employee' as type, e.created_at as time,
      u.first_name || ' ' || u.last_name as actor,
      d.name || ' department' as detail
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY e.created_at DESC LIMIT 5
  `).all()

  const all = [...leaves, ...newEmps].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
  res.json(all)
})

// Upcoming birthdays (all employees this month)
router.get('/birthdays', (req, res) => {
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const rows = db.prepare(`
    SELECT u.first_name, u.last_name, e.dob, d.name as department_name
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE strftime('%m', e.dob) = ?
    ORDER BY strftime('%d', e.dob) ASC
  `).all(month)
  res.json(rows)
})

// Announcements placeholder
router.get('/announcements', (req, res) => {
  res.json([
    { id: 1, title: 'Welcome to CoreHR React', body: 'The new React-based CoreHR platform is now live.', created_at: new Date().toISOString() },
    { id: 2, title: 'Q1 Performance Reviews', body: 'Performance reviews start next week. Please update your goals.', created_at: new Date().toISOString() },
  ])
})

export default router
