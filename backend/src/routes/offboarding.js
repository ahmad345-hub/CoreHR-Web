import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/tasks', checkPerm('offboarding.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM offboarding_tasks ORDER BY sort_order').all())
})
router.post('/tasks', checkPerm('offboarding.manage'), (req, res) => {
  const { title, description, sort_order, is_required } = req.body
  const requested = req.body.company_id
  const exists = requested && db.prepare('SELECT 1 FROM companies WHERE id = ?').get(requested)
  const emp = db.prepare('SELECT company_id FROM employees WHERE user_id = ?').get(req.user.id)
  const fallback = db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get()
  const company_id = (exists && requested) || emp?.company_id || fallback?.id || null
  const r = db.prepare('INSERT INTO offboarding_tasks (title, description, company_id, sort_order, is_required) VALUES (?, ?, ?, ?, ?)').run(title, description, company_id, sort_order || 0, is_required ? 1 : 0)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.delete('/tasks/:id', checkPerm('offboarding.manage'), (req, res) => {
  db.prepare('DELETE FROM offboarding_tasks WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

router.get('/records', checkPerm('offboarding.view'), (req, res) => {
  const { employee_id } = req.query
  const rows = db.prepare(`
    SELECT r.*, t.title as task_title,
      u.first_name || ' ' || u.last_name as employee_name
    FROM offboarding_records r
    LEFT JOIN offboarding_tasks t ON r.task_id = t.id
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    ${employee_id ? 'WHERE r.employee_id = ?' : ''}
    ORDER BY t.sort_order
  `).all(...(employee_id ? [employee_id] : []))
  res.json(rows)
})

router.post('/assign/:employee_id', checkPerm('offboarding.manage'), (req, res) => {
  const { exit_date } = req.body
  const tasks = db.prepare('SELECT id FROM offboarding_tasks').all()
  const stmt = db.prepare("INSERT OR IGNORE INTO offboarding_records (employee_id, task_id, status, exit_date) VALUES (?, ?, 'pending', ?)")
  tasks.forEach(t => stmt.run(req.params.employee_id, t.id, exit_date))
  res.json({ message: 'Offboarding initiated' })
})

router.put('/records/:id', checkPerm('offboarding.manage'), (req, res) => {
  const { status } = req.body
  const completed_at = status === 'completed' ? new Date().toISOString() : null
  db.prepare('UPDATE offboarding_records SET status = ?, completed_at = ? WHERE id = ?').run(status, completed_at, req.params.id)
  res.json({ message: 'Updated' })
})

export default router
