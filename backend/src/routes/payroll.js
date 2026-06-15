import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// ─── Contracts ────────────────────────────────────────────────
router.get('/contracts', checkPerm('payroll.view'), (req, res) => {
  const { employee_id } = req.query
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['payroll.manage'] === true

  let filterId = null
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    filterId = emp?.id ?? -1
  } else if (employee_id) {
    filterId = employee_id
  }

  const sql = `
    SELECT co.*, u.first_name || ' ' || u.last_name as employee_name, e.badge_id
    FROM contracts co
    LEFT JOIN employees e ON co.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
  `
  const rows = filterId != null
    ? db.prepare(sql + ' WHERE co.employee_id = ? ORDER BY co.start_date DESC').all(filterId)
    : db.prepare(sql + ' ORDER BY co.start_date DESC').all()
  res.json(rows)
})

router.post('/contracts', checkPerm('payroll.manage'), (req, res) => {
  const { employee_id, contract_type, start_date, end_date, wage, pay_frequency } = req.body
  const r = db.prepare(`
    INSERT INTO contracts (employee_id, contract_type, start_date, end_date, wage, pay_frequency, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(employee_id, contract_type || 'permanent', start_date, end_date, wage, pay_frequency || 'monthly')
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/contracts/:id', checkPerm('payroll.manage'), (req, res) => {
  const { contract_type, start_date, end_date, wage, pay_frequency, status } = req.body
  db.prepare('UPDATE contracts SET contract_type = ?, start_date = ?, end_date = ?, wage = ?, pay_frequency = ?, status = ? WHERE id = ?')
    .run(contract_type, start_date, end_date, wage, pay_frequency, status, req.params.id)
  res.json({ message: 'Updated' })
})

// ─── Allowances ───────────────────────────────────────────────
router.get('/allowances', checkPerm('payroll.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM allowances ORDER BY name').all())
})
router.post('/allowances', checkPerm('payroll.manage'), (req, res) => {
  const { name, amount, is_percent, company_id } = req.body
  const r = db.prepare('INSERT INTO allowances (name, amount, is_percent, company_id) VALUES (?, ?, ?, ?)').run(name, amount, is_percent ? 1 : 0, company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/allowances/:id', checkPerm('payroll.manage'), (req, res) => {
  const { name, amount, is_percent } = req.body
  db.prepare('UPDATE allowances SET name = ?, amount = ?, is_percent = ? WHERE id = ?').run(name, amount, is_percent ? 1 : 0, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/allowances/:id', checkPerm('payroll.manage'), (req, res) => {
  db.prepare('DELETE FROM allowances WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Deductions ───────────────────────────────────────────────
router.get('/deductions', checkPerm('payroll.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM deductions ORDER BY name').all())
})
router.post('/deductions', checkPerm('payroll.manage'), (req, res) => {
  const { name, amount, is_percent, company_id } = req.body
  const r = db.prepare('INSERT INTO deductions (name, amount, is_percent, company_id) VALUES (?, ?, ?, ?)').run(name, amount, is_percent ? 1 : 0, company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.delete('/deductions/:id', checkPerm('payroll.manage'), (req, res) => {
  db.prepare('DELETE FROM deductions WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Payslips ─────────────────────────────────────────────────
router.get('/payslips', checkPerm('payroll.view'), (req, res) => {
  const { employee_id, status, page = 1, limit = 20 } = req.query
  let where = ['1=1']
  const params = []

  // Regular employees only see their own payslips
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['payroll.manage'] === true
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    if (emp) { where.push('p.employee_id = ?'); params.push(emp.id) }
  } else if (employee_id) { where.push('p.employee_id = ?'); params.push(employee_id) }

  if (status) { where.push('p.status = ?'); params.push(status) }

  const offset = (Number(page) - 1) * Number(limit)
  const rows = db.prepare(`
    SELECT p.*,
      u.first_name || ' ' || u.last_name as employee_name,
      e.badge_id, d.name as department_name
    FROM payslips p
    LEFT JOIN employees e ON p.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE ${where.join(' AND ')}
    ORDER BY p.period_start DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  const total = db.prepare(`SELECT COUNT(*) as c FROM payslips p WHERE ${where.join(' AND ')}`).get(...params).c
  res.json({ results: rows, total, page: Number(page), pages: Math.ceil(total / limit) })
})

router.post('/payslips', checkPerm('payroll.manage'), (req, res) => {
  const { employee_id, contract_id, period_start, period_end, basic_pay, allowances, deductions, net_pay } = req.body
  const r = db.prepare(`
    INSERT INTO payslips (employee_id, contract_id, period_start, period_end, basic_pay, allowances, deductions, net_pay, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(employee_id, contract_id, period_start, period_end, basic_pay, allowances || 0, deductions || 0, net_pay || basic_pay)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/payslips/:id/confirm', checkPerm('payroll.manage'), (req, res) => {
  db.prepare("UPDATE payslips SET status = 'confirmed' WHERE id = ?").run(req.params.id)
  res.json({ message: 'Payslip confirmed' })
})

router.put('/payslips/:id/pay', checkPerm('payroll.manage'), (req, res) => {
  db.prepare("UPDATE payslips SET status = 'paid' WHERE id = ?").run(req.params.id)
  res.json({ message: 'Payslip marked as paid' })
})

router.delete('/payslips/:id', checkPerm('payroll.manage'), (req, res) => {
  db.prepare('DELETE FROM payslips WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Payroll Summary ──────────────────────────────────────────
router.get('/summary', checkPerm('payroll.view'), (req, res) => {
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['payroll.manage'] === true

  let where = '1=1'
  const params = []
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    where = 'employee_id = ?'
    params.push(emp?.id ?? -1)
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_payslips,
      SUM(CASE WHEN status = 'paid' THEN net_pay ELSE 0 END) as total_paid,
      SUM(CASE WHEN status = 'draft' THEN net_pay ELSE 0 END) as total_pending,
      SUM(net_pay) as total_net
    FROM payslips
    WHERE ${where}
  `).get(...params)
  res.json(stats)
})

export default router
