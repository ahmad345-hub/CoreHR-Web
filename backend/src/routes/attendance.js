import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// GET /api/attendance
router.get('/', checkPerm('attendance.view'), (req, res) => {
  const { employee_id, date_from, date_to, status, page = 1, limit = 30 } = req.query
  let where = ['1=1']
  const params = []

  // Regular employees only see their own attendance
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['attendance.manage'] === true
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    if (emp) { where.push('a.employee_id = ?'); params.push(emp.id) }
  } else if (employee_id) { where.push('a.employee_id = ?'); params.push(employee_id) }
  if (date_from)   { where.push('a.date >= ?'); params.push(date_from) }
  if (date_to)     { where.push('a.date <= ?'); params.push(date_to) }
  if (status)      { where.push('a.status = ?'); params.push(status) }

  const offset = (Number(page) - 1) * Number(limit)
  const rows = db.prepare(`
    SELECT a.*,
      u.first_name || ' ' || u.last_name as employee_name,
      e.badge_id
    FROM attendance a
    LEFT JOIN employees e ON a.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY a.date DESC, a.check_in DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  const total = db.prepare(`SELECT COUNT(*) as c FROM attendance a WHERE ${where.join(' AND ')}`).get(...params).c
  res.json({ results: rows, total, page: Number(page), pages: Math.ceil(total / limit) })
})

// GET /api/attendance/today
router.get('/today', checkPerm('attendance.view'), (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const records = db.prepare(`
    SELECT a.*,
      u.first_name || ' ' || u.last_name as employee_name,
      e.badge_id, d.name as department_name
    FROM attendance a
    LEFT JOIN employees e ON a.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE a.date = ?
    ORDER BY a.check_in ASC
  `).all(today)
  res.json(records)
})

// POST /api/attendance/clock-in
router.post('/clock-in', checkPerm('attendance.clock'), (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(req.user.id)
  if (!employee) return res.status(404).json({ error: 'Employee record not found' })

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 5)

  const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee.id, today)
  if (existing) return res.status(400).json({ error: 'Already clocked in today' })

  const record = db.prepare(`
    INSERT INTO attendance (employee_id, date, check_in, status)
    VALUES (?, ?, ?, 'present')
  `).run(employee.id, today, now)

  res.status(201).json({ id: record.lastInsertRowid, employee_id: employee.id, date: today, check_in: now })
})

// POST /api/attendance/clock-out
router.post('/clock-out', checkPerm('attendance.clock'), (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(req.user.id)
  if (!employee) return res.status(404).json({ error: 'Employee record not found' })

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 5)

  const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee.id, today)
  if (!record) return res.status(400).json({ error: 'No clock-in record found for today' })
  if (record.check_out) return res.status(400).json({ error: 'Already clocked out today' })

  const [h1, m1] = record.check_in.split(':').map(Number)
  const [h2, m2] = now.split(':').map(Number)
  const worked = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60

  db.prepare('UPDATE attendance SET check_out = ?, worked_hours = ? WHERE id = ?').run(now, Math.max(0, worked).toFixed(2), record.id)
  res.json({ ...record, check_out: now, worked_hours: worked })
})

// POST /api/attendance (manual entry)
router.post('/', checkPerm('attendance.manage'), (req, res) => {
  const { employee_id, date, check_in, check_out, status, note } = req.body
  const worked = (check_in && check_out)
    ? (() => {
        const [h1, m1] = check_in.split(':').map(Number)
        const [h2, m2] = check_out.split(':').map(Number)
        return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60).toFixed(2)
      })()
    : 0

  const rec = db.prepare(`
    INSERT INTO attendance (employee_id, date, check_in, check_out, worked_hours, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(employee_id, date, check_in, check_out, worked, status || 'present', note)

  res.status(201).json({ id: rec.lastInsertRowid })
})

// PUT /api/attendance/:id
router.put('/:id', checkPerm('attendance.manage'), (req, res) => {
  const { check_in, check_out, status, note } = req.body
  const worked = (check_in && check_out)
    ? (() => {
        const [h1, m1] = check_in.split(':').map(Number)
        const [h2, m2] = check_out.split(':').map(Number)
        return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60).toFixed(2)
      })()
    : 0
  db.prepare('UPDATE attendance SET check_in = ?, check_out = ?, worked_hours = ?, status = ?, note = ? WHERE id = ?')
    .run(check_in, check_out, worked, status, note, req.params.id)
  res.json({ message: 'Updated' })
})

// DELETE /api/attendance/:id
router.delete('/:id', checkPerm('attendance.manage'), (req, res) => {
  db.prepare('DELETE FROM attendance WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// GET /api/attendance/summary
router.get('/summary', checkPerm('attendance.view'), (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const totalEmp = db.prepare('SELECT COUNT(*) as c FROM employees WHERE is_active = 1').get().c
  const present = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'present'").get(today).c
  const onLeave = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE start_date <= ? AND end_date >= ? AND status = 'approved'").get(today, today).c
  const absent = totalEmp - present - onLeave
  res.json({ total: totalEmp, present, on_leave: onLeave, absent: Math.max(0, absent), date: today })
})

export default router
