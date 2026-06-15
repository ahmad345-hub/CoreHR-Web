import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'
import { notifyAdmins } from '../services/notifier.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const cvStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/cvs'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `emp_cv_${req.user?.id || 'u'}_${Date.now()}${ext}`)
  },
})
const uploadCV = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, DOC, DOCX files allowed'))
  },
})

const router = Router()
router.use(authenticate)

const EMPLOYEE_SELECT = `
  SELECT
    e.*,
    u.username, u.email, u.first_name, u.last_name, u.is_active as user_active,
    d.name as department_name,
    jp.title as job_title,
    wt.name as work_type_name,
    s.name as shift_name,
    c.name as company_name
  FROM employees e
  LEFT JOIN users u ON e.user_id = u.id
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN job_positions jp ON e.job_position_id = jp.id
  LEFT JOIN work_types wt ON e.work_type_id = wt.id
  LEFT JOIN shifts s ON e.shift_id = s.id
  LEFT JOIN companies c ON e.company_id = c.id
`

// GET /api/employees/me — own employee record (no permission required)
router.get('/me', (req, res) => {
  const emp = db.prepare(`${EMPLOYEE_SELECT} WHERE e.user_id = ?`).get(req.user.id)
  if (!emp) return res.status(404).json({ error: 'No employee profile found' })
  res.json(emp)
})

// GET /api/employees/me/attendance
router.get('/me/attendance', (req, res) => {
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  if (!emp) return res.json([])
  const records = db.prepare('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 30').all(emp.id)
  res.json(records)
})

// GET /api/employees/me/leave
router.get('/me/leave', (req, res) => {
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id)
  if (!emp) return res.json({ requests: [], allocations: [] })
  const requests = db.prepare(`
    SELECT lr.*, lt.name as leave_type_name
    FROM leave_requests lr
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.employee_id = ? ORDER BY lr.created_at DESC
  `).all(emp.id)
  const allocations = db.prepare(`
    SELECT la.*, lt.name as leave_type_name
    FROM leave_allocations la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.employee_id = ?
  `).all(emp.id)
  res.json({ requests, allocations })
})

// POST /api/employees/me/cv — employee uploads their own CV
router.post('/me/cv', (req, res) => {
  uploadCV.single('cv')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const emp = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(req.user.id)
    if (!emp) return res.status(404).json({ error: 'No employee profile found' })

    const resumeUrl = `/uploads/cvs/${req.file.filename}`
    db.prepare('UPDATE employees SET resume_url = ? WHERE id = ?').run(resumeUrl, emp.id)

    res.json({ resume_url: resumeUrl })
  })
})

// GET /api/employees
router.get('/', checkPerm('employees.view'), (req, res) => {
  const { search, department, status, page = 1, limit = 20 } = req.query
  let where = ['1=1']
  const params = []

  if (search) {
    where.push("(u.first_name || ' ' || u.last_name LIKE ? OR u.email LIKE ? OR e.badge_id LIKE ?)")
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (department) { where.push('e.department_id = ?'); params.push(department) }
  if (status === 'active') { where.push('e.is_active = 1') }
  if (status === 'inactive') { where.push('e.is_active = 0') }

  const offset = (Number(page) - 1) * Number(limit)
  const rows = db.prepare(`${EMPLOYEE_SELECT} WHERE ${where.join(' AND ')} LIMIT ? OFFSET ?`).all(...params, limit, offset)
  const total = db.prepare(`SELECT COUNT(*) as c FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE ${where.join(' AND ')}`).get(...params).c

  res.json({ results: rows, total, page: Number(page), pages: Math.ceil(total / limit) })
})

// GET /api/employees/:id
router.get('/:id', checkPerm('employees.view'), (req, res) => {
  const emp = db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Employee not found' })
  res.json(emp)
})

// POST /api/employees
router.post('/', checkPerm('employees.create'), (req, res) => {
  const {
    username, email, password = 'password123', first_name, last_name,
    badge_id, job_position_id, department_id, company_id,
    work_type_id, shift_id, date_joining, salary, phone,
    address, city, country, gender, dob,
  } = req.body

  const userId = db.prepare(`
    INSERT INTO users (username, email, password, first_name, last_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, email, bcrypt.hashSync(password, 10), first_name, last_name).lastInsertRowid

  const empId = db.prepare(`
    INSERT INTO employees (badge_id, user_id, job_position_id, department_id, company_id,
      work_type_id, shift_id, date_joining, salary, phone, address, city, country, gender, dob)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(badge_id, userId, job_position_id, department_id, company_id,
    work_type_id, shift_id, date_joining, salary, phone, address, city, country, gender, dob).lastInsertRowid

  const emp = db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(empId)
  notifyAdmins('New Employee Added', `${first_name} ${last_name} has been added to the system`, '/employees')
  res.status(201).json(emp)
})

// PUT /api/employees/:id
router.put('/:id', checkPerm('employees.edit'), (req, res) => {
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Employee not found' })

  const {
    first_name, last_name, email,
    job_position_id, department_id, work_type_id, shift_id,
    date_joining, salary, phone, address, city, country, gender, dob, is_active,
  } = req.body

  db.prepare('UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?').run(first_name, last_name, email, emp.user_id)
  db.prepare(`
    UPDATE employees SET
      job_position_id = ?, department_id = ?, work_type_id = ?, shift_id = ?,
      date_joining = ?, salary = ?, phone = ?, address = ?, city = ?,
      country = ?, gender = ?, dob = ?, is_active = ?
    WHERE id = ?
  `).run(job_position_id, department_id, work_type_id, shift_id, date_joining, salary,
    phone, address, city, country, gender, dob, is_active ? 1 : 0, req.params.id)

  res.json(db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(req.params.id))
})

// PUT /api/employees/:id/reset-password — admin resets employee password
router.put('/:id/reset-password', checkPerm('employees.edit'), (req, res) => {
  const { new_password } = req.body
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Employee not found' })
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), emp.user_id)
  res.json({ message: 'Password reset successfully' })
})

// DELETE /api/employees/:id
router.delete('/:id', checkPerm('employees.delete'), (req, res) => {
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Employee not found' })
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id)
  db.prepare('DELETE FROM users WHERE id = ?').run(emp.user_id)
  res.json({ message: 'Employee deleted' })
})

// GET /api/employees/:id/attendance
router.get('/:id/attendance', checkPerm('employees.view'), (req, res) => {
  const records = db.prepare('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 30').all(req.params.id)
  res.json(records)
})

// GET /api/employees/:id/leave
router.get('/:id/leave', checkPerm('employees.view'), (req, res) => {
  const requests = db.prepare(`
    SELECT lr.*, lt.name as leave_type_name
    FROM leave_requests lr
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.employee_id = ? ORDER BY lr.created_at DESC
  `).all(req.params.id)
  const allocations = db.prepare(`
    SELECT la.*, lt.name as leave_type_name
    FROM leave_allocations la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.employee_id = ?
  `).all(req.params.id)
  res.json({ requests, allocations })
})

// GET /api/employees/:id/documents
router.get('/:id/documents', checkPerm('employees.view'), (req, res) => {
  res.json([]) // Placeholder — extend with a documents table if needed
})

export default router
