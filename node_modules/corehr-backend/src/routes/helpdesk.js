import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'
import { notifyManagers } from '../services/notifier.js'

const router = Router()
router.use(authenticate)

router.get('/categories', checkPerm('helpdesk.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM helpdesk_categories ORDER BY name').all())
})
router.post('/categories', checkPerm('helpdesk.manage'), (req, res) => {
  const { name, description } = req.body
  const r = db.prepare('INSERT INTO helpdesk_categories (name, description) VALUES (?, ?)').run(name, description || null)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/categories/:id', checkPerm('helpdesk.manage'), (req, res) => {
  const { name, description } = req.body
  db.prepare('UPDATE helpdesk_categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/categories/:id', checkPerm('helpdesk.manage'), (req, res) => {
  db.prepare('DELETE FROM helpdesk_categories WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

router.get('/tickets', checkPerm('helpdesk.view'), (req, res) => {
  const { status, priority, category_id, page = 1, limit = 20 } = req.query
  let where = ['1=1']
  const params = []

  // Regular employees only see their own tickets
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['helpdesk.manage'] === true
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    if (emp) { where.push('t.employee_id = ?'); params.push(emp.id) }
  }

  if (status)      { where.push('t.status = ?'); params.push(status) }
  if (priority)    { where.push('t.priority = ?'); params.push(priority) }
  if (category_id) { where.push('t.category_id = ?'); params.push(category_id) }

  const offset = (Number(page) - 1) * Number(limit)
  const rows = db.prepare(`
    SELECT t.*,
      c.name as category_name,
      u.first_name || ' ' || u.last_name as employee_name,
      au.first_name || ' ' || au.last_name as assigned_name
    FROM helpdesk_tickets t
    LEFT JOIN helpdesk_categories c ON t.category_id = c.id
    LEFT JOIN employees e ON t.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN users au ON t.assigned_to = au.id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  const total = db.prepare(`SELECT COUNT(*) as c FROM helpdesk_tickets t WHERE ${where.join(' AND ')}`).get(...params).c
  res.json({ results: rows, total, page: Number(page), pages: Math.ceil(total / limit) })
})

router.post('/tickets', checkPerm('helpdesk.create'), (req, res) => {
  const { title, description, category_id, priority } = req.body
  const requested = req.body.employee_id
  const exists = requested && db.prepare('SELECT 1 FROM employees WHERE id = ?').get(requested)
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  const fallback = db.prepare('SELECT id FROM employees ORDER BY id LIMIT 1').get()
  const employee_id = (exists && requested) || emp?.id || fallback?.id || null
  const validCat = category_id && db.prepare('SELECT 1 FROM helpdesk_categories WHERE id = ?').get(category_id) ? category_id : null
  const r = db.prepare(`
    INSERT INTO helpdesk_tickets (title, description, employee_id, category_id, priority, status)
    VALUES (?, ?, ?, ?, ?, 'open')
  `).run(title, description, employee_id, validCat, priority || 'medium')
  notifyManagers('New Support Ticket', `${req.user.first_name} ${req.user.last_name} created ticket: "${title}" [${priority || 'medium'}]`, '/helpdesk')
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/tickets/:id', checkPerm('helpdesk.manage'), (req, res) => {
  const { status, assigned_to, priority } = req.body
  const resolved_at = status === 'resolved' ? new Date().toISOString() : null
  db.prepare('UPDATE helpdesk_tickets SET status = ?, assigned_to = ?, priority = ?, resolved_at = ? WHERE id = ?').run(status, assigned_to, priority, resolved_at, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/tickets/:id', checkPerm('helpdesk.manage'), (req, res) => {
  db.prepare('DELETE FROM helpdesk_tickets WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
