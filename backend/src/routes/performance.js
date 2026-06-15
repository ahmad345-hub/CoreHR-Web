import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Goals
router.get('/goals', checkPerm('performance.view'), (req, res) => {
  const { employee_id } = req.query
  // Regular employees only see their own goals
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['performance.manage'] === true
  let filterId = employee_id
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    filterId = emp?.id
  }
  const rows = db.prepare(`
    SELECT g.*, u.first_name || ' ' || u.last_name as employee_name, d.name as department_name
    FROM performance_goals g
    LEFT JOIN employees e ON g.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    ${filterId ? 'WHERE g.employee_id = ?' : ''}
    ORDER BY g.created_at DESC
  `).all(...(filterId ? [filterId] : []))
  res.json(rows)
})

router.post('/goals', checkPerm('performance.manage'), (req, res) => {
  const { title, description, target_date, progress } = req.body
  const requested = req.body.employee_id
  const exists = requested && db.prepare('SELECT 1 FROM employees WHERE id = ?').get(requested)
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  const fallback = db.prepare('SELECT id FROM employees ORDER BY id LIMIT 1').get()
  const employee_id = (exists && requested) || emp?.id || fallback?.id || null
  if (!employee_id) return res.status(400).json({ error: 'No employees exist — create one first' })
  const p = Math.max(0, Math.min(100, Number(progress) || 0))
  const status = p >= 100 ? 'completed' : 'active'
  const r = db.prepare(`
    INSERT INTO performance_goals (employee_id, title, description, target_date, progress, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(employee_id, title, description, target_date, p, status)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/goals/:id', checkPerm('performance.view'), (req, res) => {
  const current = db.prepare('SELECT * FROM performance_goals WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Goal not found' })

  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['performance.manage'] === true
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  const isOwner = emp && emp.id === current.employee_id
  if (!canManage && !isOwner) return res.status(403).json({ error: 'Forbidden' })

  const ALLOWED = ['active', 'completed', 'cancelled']
  const merged = canManage ? {
    title:       req.body.title       ?? current.title,
    description: req.body.description ?? current.description,
    target_date: req.body.target_date ?? current.target_date,
    progress:    req.body.progress    ?? current.progress,
    status:      ALLOWED.includes(req.body.status) ? req.body.status : current.status,
  } : {
    title:       current.title,
    description: current.description,
    target_date: current.target_date,
    progress:    req.body.progress    ?? current.progress,
    status:      current.status,
  }
  if (merged.progress >= 100) merged.status = 'completed'
  else if (merged.progress > 0 && merged.status !== 'cancelled') merged.status = 'active'
  db.prepare('UPDATE performance_goals SET title = ?, description = ?, target_date = ?, progress = ?, status = ? WHERE id = ?')
    .run(merged.title, merged.description, merged.target_date, merged.progress, merged.status, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/goals/:id', checkPerm('performance.manage'), (req, res) => {
  db.prepare('DELETE FROM performance_goals WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// Feedback
router.get('/feedback', checkPerm('performance.view'), (req, res) => {
  const { employee_id } = req.query
  const rows = db.prepare(`
    SELECT f.*,
      u.first_name || ' ' || u.last_name as from_name,
      ue.first_name || ' ' || ue.last_name as to_name
    FROM feedback f
    LEFT JOIN users u ON f.from_user_id = u.id
    LEFT JOIN employees e ON f.to_employee_id = e.id
    LEFT JOIN users ue ON e.user_id = ue.id
    ${employee_id ? 'WHERE f.to_employee_id = ?' : ''}
    ORDER BY f.created_at DESC
  `).all(...(employee_id ? [employee_id] : []))
  res.json(rows)
})

router.post('/feedback', checkPerm('performance.manage'), (req, res) => {
  const { to_employee_id, rating, comment, period } = req.body
  const r = db.prepare(`
    INSERT INTO feedback (from_user_id, to_employee_id, rating, comment, period)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, to_employee_id, rating, comment, period)
  res.status(201).json({ id: r.lastInsertRowid })
})

export default router
