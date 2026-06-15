import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Headcount by department over time (current snapshot)
router.get('/headcount', checkPerm('reports.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT d.name as department,
      COUNT(e.id) as total,
      SUM(CASE WHEN e.gender = 'male' THEN 1 ELSE 0 END) as male,
      SUM(CASE WHEN e.gender = 'female' THEN 1 ELSE 0 END) as female
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = 1
    GROUP BY d.id, d.name ORDER BY total DESC
  `).all()
  res.json(rows)
})

// Attendance report
router.get('/attendance', checkPerm('reports.view'), (req, res) => {
  const { month, year } = req.query
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0')
  const y = year || new Date().getFullYear()
  const rows = db.prepare(`
    SELECT u.first_name || ' ' || u.last_name as employee,
      d.name as department,
      COUNT(a.id) as days_present,
      ROUND(AVG(a.worked_hours), 2) as avg_hours,
      SUM(a.worked_hours) as total_hours
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN attendance a ON a.employee_id = e.id
      AND strftime('%Y', a.date) = ? AND strftime('%m', a.date) = ?
    WHERE e.is_active = 1
    GROUP BY e.id ORDER BY total_hours DESC
  `).all(String(y), String(m).padStart(2, '0'))
  res.json(rows)
})

// Leave report
router.get('/leave', checkPerm('reports.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT u.first_name || ' ' || u.last_name as employee,
      d.name as department,
      lt.name as leave_type,
      COUNT(lr.id) as requests,
      SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END) as approved_days,
      SUM(CASE WHEN lr.status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN leave_requests lr ON lr.employee_id = e.id
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE e.is_active = 1
    GROUP BY e.id, lt.id ORDER BY approved_days DESC
  `).all()
  res.json(rows)
})

// Payroll report
router.get('/payroll', checkPerm('reports.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT u.first_name || ' ' || u.last_name as employee,
      d.name as department,
      SUM(p.basic_pay) as total_basic,
      SUM(p.allowances) as total_allowances,
      SUM(p.deductions) as total_deductions,
      SUM(p.net_pay) as total_net,
      COUNT(p.id) as payslip_count
    FROM payslips p
    LEFT JOIN employees e ON p.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE p.status = 'paid'
    GROUP BY e.id ORDER BY total_net DESC
  `).all()
  res.json(rows)
})

// Recruitment report
router.get('/recruitment', checkPerm('reports.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT jp.title as position,
      COUNT(c.id) as total_candidates,
      SUM(CASE WHEN c.status = 'hired' THEN 1 ELSE 0 END) as hired,
      SUM(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as in_pipeline
    FROM job_postings jp
    LEFT JOIN candidates c ON c.posting_id = jp.id
    GROUP BY jp.id ORDER BY total_candidates DESC
  `).all()
  res.json(rows)
})

export default router
