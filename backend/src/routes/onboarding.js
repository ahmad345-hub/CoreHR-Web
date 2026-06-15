import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/tasks', checkPerm('onboarding.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM onboarding_tasks ORDER BY sort_order').all())
})
router.post('/tasks', checkPerm('onboarding.manage'), (req, res) => {
  const { title, description, sort_order, is_required } = req.body
  const requested = req.body.company_id
  const exists = requested && db.prepare('SELECT 1 FROM companies WHERE id = ?').get(requested)
  const emp = db.prepare('SELECT company_id FROM employees WHERE user_id = ?').get(req.user.id)
  const fallback = db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get()
  const company_id = (exists && requested) || emp?.company_id || fallback?.id || null
  const r = db.prepare('INSERT INTO onboarding_tasks (title, description, company_id, sort_order, is_required) VALUES (?, ?, ?, ?, ?)').run(title, description, company_id, sort_order || 0, is_required ? 1 : 0)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/tasks/:id', checkPerm('onboarding.manage'), (req, res) => {
  const { title, description, is_required } = req.body
  db.prepare('UPDATE onboarding_tasks SET title = ?, description = ?, is_required = ? WHERE id = ?').run(title, description, is_required ? 1 : 0, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/tasks/:id', checkPerm('onboarding.manage'), (req, res) => {
  db.prepare('DELETE FROM onboarding_tasks WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

router.get('/records', checkPerm('onboarding.view'), (req, res) => {
  const { employee_id } = req.query
  const rows = db.prepare(`
    SELECT r.*, t.title as task_title, t.description as task_description,
      u.first_name || ' ' || u.last_name as employee_name
    FROM onboarding_records r
    LEFT JOIN onboarding_tasks t ON r.task_id = t.id
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    ${employee_id ? 'WHERE r.employee_id = ?' : ''}
    ORDER BY t.sort_order
  `).all(...(employee_id ? [employee_id] : []))
  res.json(rows)
})

router.post('/assign/:employee_id', checkPerm('onboarding.manage'), (req, res) => {
  const tasks = db.prepare('SELECT id FROM onboarding_tasks').all()
  const stmt = db.prepare("INSERT OR IGNORE INTO onboarding_records (employee_id, task_id, status) VALUES (?, ?, 'pending')")
  tasks.forEach(t => stmt.run(req.params.employee_id, t.id))
  res.json({ message: 'Tasks assigned' })
})

router.put('/records/:id', checkPerm('onboarding.manage'), (req, res) => {
  const { status } = req.body
  const completed_at = status === 'completed' ? new Date().toISOString() : null
  db.prepare('UPDATE onboarding_records SET status = ?, completed_at = ? WHERE id = ?').run(status, completed_at, req.params.id)
  res.json({ message: 'Updated' })
})

export default router
