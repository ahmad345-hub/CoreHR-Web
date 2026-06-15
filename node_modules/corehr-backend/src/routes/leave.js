import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'
import { notifyManagers, notifyEmployee } from '../services/notifier.js'

const router = Router()
router.use(authenticate)

// ─── Leave Types ──────────────────────────────────────────────
router.get('/types', checkPerm('leave.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM leave_types ORDER BY name').all())
})
router.post('/types', checkPerm('leave.manage_types'), (req, res) => {
  const { name, total_days, carryforward, paid, company_id } = req.body
  const r = db.prepare('INSERT INTO leave_types (name, total_days, carryforward, paid, company_id) VALUES (?, ?, ?, ?, ?)').run(name, total_days, carryforward ? 1 : 0, paid ? 1 : 0, company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/types/:id', checkPerm('leave.manage_types'), (req, res) => {
  const { name, total_days, carryforward, paid } = req.body
  db.prepare('UPDATE leave_types SET name = ?, total_days = ?, carryforward = ?, paid = ? WHERE id = ?').run(name, total_days, carryforward ? 1 : 0, paid ? 1 : 0, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/types/:id', checkPerm('leave.manage_types'), (req, res) => {
  db.prepare('DELETE FROM leave_types WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Leave Allocations ────────────────────────────────────────
router.get('/allocations', checkPerm('leave.view'), (req, res) => {
  const { employee_id } = req.query
  let sql = `
    SELECT la.*, lt.name as leave_type_name,
      u.first_name || ' ' || u.last_name as employee_name
    FROM leave_allocations la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    LEFT JOIN employees e ON la.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
  `
  if (employee_id) {
    return res.json(db.prepare(sql + ' WHERE la.employee_id = ?').all(employee_id))
  }
  res.json(db.prepare(sql + ' ORDER BY la.id DESC').all())
})
router.post('/allocations', checkPerm('leave.manage_types'), (req, res) => {
  const { employee_id, leave_type_id, total_days } = req.body
  const r = db.prepare('INSERT INTO leave_allocations (employee_id, leave_type_id, total_days) VALUES (?, ?, ?)').run(employee_id, leave_type_id, total_days)
  res.status(201).json({ id: r.lastInsertRowid })
})

// ─── Leave Requests ────────────────────────────────────────────
router.get('/requests', checkPerm('leave.view'), (req, res) => {
  const { status, employee_id, page = 1, limit = 20 } = req.query
  let where = ['1=1']
  const params = []

  // Regular employees only see their own requests
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canApprove = req.user.is_superuser || perms['leave.approve'] === true
  if (!canApprove) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    if (emp) { where.push('lr.employee_id = ?'); params.push(emp.id) }
  }

  if (status) { where.push('lr.status = ?'); params.push(status) }
  if (employee_id && canApprove) { where.push('lr.employee_id = ?'); params.push(employee_id) }
  const offset = (Number(page) - 1) * Number(limit)
  const rows = db.prepare(`
    SELECT lr.*, lt.name as leave_type_name,
      u.first_name || ' ' || u.last_name as employee_name,
      e.badge_id, d.name as department_name
    FROM leave_requests lr
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE ${where.join(' AND ')}
    ORDER BY lr.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  const total = db.prepare(`SELECT COUNT(*) as c FROM leave_requests lr WHERE ${where.join(' AND ')}`).get(...params).c
  res.json({ results: rows, total, page: Number(page), pages: Math.ceil(total / limit) })
})

router.post('/requests', checkPerm('leave.apply'), (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(req.user.id)
  const { leave_type_id, start_date, end_date, days, reason } = req.body
  const r = db.prepare(`
    INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(employee?.id || req.body.employee_id, leave_type_id, start_date, end_date, days, reason)
  notifyManagers('New Leave Request', `${req.user.first_name} ${req.user.last_name} submitted a leave request (${start_date} to ${end_date})`, '/leave')
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/requests/:id/approve', checkPerm('leave.approve'), (req, res) => {
  const now = new Date().toISOString()
  db.prepare("UPDATE leave_requests SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?").run(req.user.id, now, req.params.id)
  const lr = db.prepare('SELECT employee_id FROM leave_requests WHERE id = ?').get(req.params.id)
  if (lr) { const emp = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(lr.employee_id); if (emp) notifyEmployee(emp.user_id, 'Leave Approved', 'Your leave request has been approved', '/leave') }
  res.json({ message: 'Leave approved' })
})

router.put('/requests/:id/reject', checkPerm('leave.approve'), (req, res) => {
  db.prepare("UPDATE leave_requests SET status = 'rejected', approved_by = ?, approved_at = ? WHERE id = ?").run(req.user.id, new Date().toISOString(), req.params.id)
  const lr = db.prepare('SELECT employee_id FROM leave_requests WHERE id = ?').get(req.params.id)
  if (lr) { const emp = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(lr.employee_id); if (emp) notifyEmployee(emp.user_id, 'Leave Rejected', 'Your leave request has been rejected', '/leave') }
  res.json({ message: 'Leave rejected' })
})

router.put('/requests/:id', checkPerm('leave.apply'), (req, res) => {
  const { status } = req.body
  db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/requests/:id', checkPerm('leave.apply'), (req, res) => {
  db.prepare('DELETE FROM leave_requests WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
