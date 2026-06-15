import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/', checkPerm('projects.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.status = 'done') as completed_tasks
    FROM projects p ORDER BY p.created_at DESC
  `).all()
  res.json(rows)
})

router.post('/', checkPerm('projects.manage'), (req, res) => {
  const { name, description, start_date, end_date, status } = req.body
  // Validate company_id exists, fallback to user's company or first available
  const emp = db.prepare('SELECT company_id FROM employees WHERE user_id = ?').get(req.user.id)
  const defaultCompany = db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get()
  let company_id = req.body.company_id
  if (company_id) {
    const exists = db.prepare('SELECT id FROM companies WHERE id = ?').get(company_id)
    if (!exists) company_id = null
  }
  company_id = company_id || emp?.company_id || defaultCompany?.id || null
  const r = db.prepare(`
    INSERT INTO projects (name, description, start_date, end_date, status, company_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, description || null, start_date || null, end_date || null, status || 'active', company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/:id', checkPerm('projects.manage'), (req, res) => {
  const { name, description, start_date, end_date, status } = req.body
  db.prepare('UPDATE projects SET name = ?, description = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?').run(name, description, start_date, end_date, status, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/:id', checkPerm('projects.manage'), (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// Tasks
function taskFilterForUser(req) {
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['projects.manage'] === true
  if (canManage) return { sql: '', params: [] }
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  return { sql: ' AND t.assigned_to = ?', params: [emp?.id ?? -1] }
}

router.get('/all-tasks', checkPerm('projects.view'), (req, res) => {
  const f = taskFilterForUser(req)
  const rows = db.prepare(`
    SELECT t.*, p.name as project_name, u.first_name || ' ' || u.last_name as assigned_to_name
    FROM project_tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN employees e ON t.assigned_to = e.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE 1=1 ${f.sql}
    ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.created_at
  `).all(...f.params)
  res.json(rows)
})

router.get('/:id/tasks', checkPerm('projects.view'), (req, res) => {
  const f = taskFilterForUser(req)
  const rows = db.prepare(`
    SELECT t.*, p.name as project_name, u.first_name || ' ' || u.last_name as assigned_to_name
    FROM project_tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN employees e ON t.assigned_to = e.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE t.project_id = ? ${f.sql}
    ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.created_at
  `).all(req.params.id, ...f.params)
  res.json(rows)
})

router.post('/:id/tasks', checkPerm('projects.manage'), (req, res) => {
  const { title, description, assigned_to, priority, status, due_date } = req.body
  const r = db.prepare(`
    INSERT INTO project_tasks (project_id, title, description, assigned_to, priority, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, title, description, assigned_to, priority || 'medium', status || 'todo', due_date)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/tasks/:task_id', checkPerm('projects.manage'), (req, res) => {
  const { title, description, assigned_to, priority, status, due_date } = req.body
  db.prepare('UPDATE project_tasks SET title = ?, description = ?, assigned_to = ?, priority = ?, status = ?, due_date = ? WHERE id = ?').run(title, description, assigned_to, priority, status, due_date, req.params.task_id)
  res.json({ message: 'Updated' })
})

router.delete('/tasks/:task_id', checkPerm('projects.manage'), (req, res) => {
  db.prepare('DELETE FROM project_tasks WHERE id = ?').run(req.params.task_id)
  res.json({ message: 'Deleted' })
})

// Timesheets
router.get('/timesheets', checkPerm('projects.view'), (req, res) => {
  const { employee_id } = req.query
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const perms = permRecord ? JSON.parse(permRecord.permissions) : {}
  const canManage = req.user.is_superuser || perms['projects.manage'] === true

  let filterId = null
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    filterId = emp?.id ?? -1
  } else if (employee_id) {
    filterId = employee_id
  }

  const rows = db.prepare(`
    SELECT ts.*, u.first_name || ' ' || u.last_name as employee_name,
      pt.title as task_title,
      COALESCE(p2.name, p.name) as project_name
    FROM timesheets ts
    LEFT JOIN employees e ON ts.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN project_tasks pt ON ts.task_id = pt.id
    LEFT JOIN projects p ON pt.project_id = p.id
    LEFT JOIN projects p2 ON ts.project_id = p2.id
    ${filterId != null ? 'WHERE ts.employee_id = ?' : ''}
    ORDER BY ts.date DESC LIMIT 50
  `).all(...(filterId != null ? [filterId] : []))
  res.json(rows)
})

router.post('/timesheets', checkPerm('projects.view'), (req, res) => {
  const canManage = req.user.is_superuser || req.userPermissions?.['projects.manage'] === true
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  const { task_id, date, hours, description, project_id } = req.body
  // Employees always log time for themselves; managers can specify employee_id
  const empId = canManage && req.body.employee_id ? req.body.employee_id : employee?.id
  if (!empId) return res.status(400).json({ error: 'No employee record found for this user' })
  const r = db.prepare('INSERT INTO timesheets (employee_id, task_id, project_id, date, hours, description) VALUES (?, ?, ?, ?, ?, ?)').run(empId, task_id || null, project_id || null, date, hours, description)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/timesheets/:id', checkPerm('projects.view'), (req, res) => {
  const canManage = req.user.is_superuser || req.userPermissions?.['projects.manage'] === true
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    const ts = db.prepare('SELECT employee_id FROM timesheets WHERE id = ?').get(req.params.id)
    if (!ts || ts.employee_id !== emp?.id) return res.status(403).json({ error: 'Permission denied' })
  }
  const { task_id, date, hours, description } = req.body
  db.prepare('UPDATE timesheets SET task_id = ?, date = ?, hours = ?, description = ? WHERE id = ?').run(task_id || null, date, hours, description, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/timesheets/:id', checkPerm('projects.view'), (req, res) => {
  const canManage = req.user.is_superuser || req.userPermissions?.['projects.manage'] === true
  if (!canManage) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
    const ts = db.prepare('SELECT employee_id FROM timesheets WHERE id = ?').get(req.params.id)
    if (!ts || ts.employee_id !== emp?.id) return res.status(403).json({ error: 'Permission denied' })
  }
  db.prepare('DELETE FROM timesheets WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
