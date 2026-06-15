import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Companies
router.get('/companies', checkPerm('settings.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM companies ORDER BY name').all())
})
router.post('/companies', checkPerm('settings.manage'), (req, res) => {
  const { name, phone, email, address, country, industry } = req.body
  const r = db.prepare('INSERT INTO companies (name, phone, email, address, country, industry) VALUES (?, ?, ?, ?, ?, ?)').run(name, phone ?? null, email ?? null, address ?? null, country ?? null, industry ?? null)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/companies/:id', checkPerm('settings.manage'), (req, res) => {
  const { name, phone, email, address, country, industry } = req.body
  db.prepare('UPDATE companies SET name = ?, phone = ?, email = ?, address = ?, country = ?, industry = ? WHERE id = ?').run(name, phone ?? null, email ?? null, address ?? null, country ?? null, industry ?? null, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/companies/:id', checkPerm('settings.manage'), (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// Departments
router.get('/departments', checkPerm('settings.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT d.*, c.name as company_name,
      (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = 1) as employee_count
    FROM departments d
    LEFT JOIN companies c ON d.company_id = c.id
    ORDER BY d.name
  `).all()
  res.json(rows)
})
router.post('/departments', checkPerm('settings.manage'), (req, res) => {
  const r = db.prepare('INSERT INTO departments (name, company_id) VALUES (?, ?)').run(req.body.name, req.body.company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/departments/:id', checkPerm('settings.manage'), (req, res) => {
  db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(req.body.name, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/departments/:id', checkPerm('settings.manage'), (req, res) => {
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// Job Positions (both /job-positions and /positions are supported)
const getPositions = (req, res) => {
  const rows = db.prepare(`
    SELECT jp.*, d.name as department_name
    FROM job_positions jp
    LEFT JOIN departments d ON jp.department_id = d.id
    ORDER BY jp.title
  `).all()
  res.json(rows)
}
const addPosition = (req, res) => {
  const r = db.prepare('INSERT INTO job_positions (title, department_id, company_id) VALUES (?, ?, ?)').run(req.body.title, req.body.department_id ?? null, req.body.company_id ?? null)
  res.status(201).json({ id: r.lastInsertRowid })
}
const deletePosition = (req, res) => {
  db.prepare('DELETE FROM job_positions WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
}
const updatePosition = (req, res) => {
  db.prepare('UPDATE job_positions SET title = ?, department_id = ? WHERE id = ?').run(req.body.title, req.body.department_id ?? null, req.params.id)
  res.json({ message: 'Updated' })
}
router.get('/job-positions', checkPerm('settings.view'), getPositions)
router.post('/job-positions', checkPerm('settings.manage'), addPosition)
router.put('/job-positions/:id', checkPerm('settings.manage'), updatePosition)
router.delete('/job-positions/:id', checkPerm('settings.manage'), deletePosition)
router.get('/positions', checkPerm('settings.view'), getPositions)
router.post('/positions', checkPerm('settings.manage'), addPosition)
router.put('/positions/:id', checkPerm('settings.manage'), updatePosition)
router.delete('/positions/:id', checkPerm('settings.manage'), deletePosition)

// Work Types
router.get('/work-types', checkPerm('settings.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM work_types ORDER BY name').all())
})
router.post('/work-types', checkPerm('settings.manage'), (req, res) => {
  const r = db.prepare('INSERT INTO work_types (name) VALUES (?)').run(req.body.name)
  res.status(201).json({ id: r.lastInsertRowid })
})

// Shifts
router.get('/shifts', checkPerm('settings.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM shifts ORDER BY name').all())
})
router.post('/shifts', checkPerm('settings.manage'), (req, res) => {
  const { name, start_time, end_time, company_id } = req.body
  const r = db.prepare('INSERT INTO shifts (name, start_time, end_time, company_id) VALUES (?, ?, ?, ?)').run(name, start_time, end_time, company_id ?? null)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/shifts/:id', checkPerm('settings.manage'), (req, res) => {
  const { name, start_time, end_time } = req.body
  db.prepare('UPDATE shifts SET name = ?, start_time = ?, end_time = ? WHERE id = ?').run(name, start_time, end_time, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/shifts/:id', checkPerm('settings.manage'), (req, res) => {
  db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// Holidays
router.get('/holidays', checkPerm('settings.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM holidays ORDER BY date').all())
})
router.post('/holidays', checkPerm('settings.manage'), (req, res) => {
  const recurring = req.body.recurring === '1' || req.body.recurring === true ? 1 : 0
  const r = db.prepare('INSERT INTO holidays (name, date, recurring, company_id) VALUES (?, ?, ?, ?)').run(req.body.name, req.body.date, recurring, req.body.company_id ?? null)
  res.status(201).json({ id: r.lastInsertRowid })
})
router.put('/holidays/:id', checkPerm('settings.manage'), (req, res) => {
  const recurring = req.body.recurring === '1' || req.body.recurring === true ? 1 : 0
  db.prepare('UPDATE holidays SET name = ?, date = ?, recurring = ? WHERE id = ?').run(req.body.name, req.body.date, recurring, req.params.id)
  res.json({ message: 'Updated' })
})
router.delete('/holidays/:id', checkPerm('settings.manage'), (req, res) => {
  db.prepare('DELETE FROM holidays WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

export default router
