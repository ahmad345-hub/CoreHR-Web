import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'
import { getDefaultPermissions } from './permissions.js'

const router = Router()

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1').get(username, username)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'corehr-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

  const employee = db.prepare(`
    SELECT e.*, d.name as department_name, jp.title as job_title
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN job_positions jp ON e.job_position_id = jp.id
    WHERE e.user_id = ?
  `).get(user.id)

  const role = user.is_superuser ? 'admin' : user.is_staff ? 'manager' : 'employee'

  // Get or create user permissions
  let permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(user.id)
  if (!permRecord) {
    const defaults = getDefaultPermissions(role)
    db.prepare('INSERT INTO user_permissions (user_id, permissions) VALUES (?, ?)').run(user.id, JSON.stringify(defaults))
    permRecord = { permissions: JSON.stringify(defaults) }
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_staff: !!user.is_staff,
      is_superuser: !!user.is_superuser,
      role,
      permissions: JSON.parse(permRecord.permissions),
      employee,
    },
  })
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const employee = db.prepare(`
    SELECT e.*, d.name as department_name, jp.title as job_title
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN job_positions jp ON e.job_position_id = jp.id
    WHERE e.user_id = ?
  `).get(req.user.id)

  const role = req.user.is_superuser ? 'admin' : req.user.is_staff ? 'manager' : 'employee'

  let permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  if (!permRecord) {
    const defaults = getDefaultPermissions(role)
    db.prepare('INSERT INTO user_permissions (user_id, permissions) VALUES (?, ?)').run(req.user.id, JSON.stringify(defaults))
    permRecord = { permissions: JSON.stringify(defaults) }
  }

  res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    is_staff: !!req.user.is_staff,
    is_superuser: !!req.user.is_superuser,
    role,
    permissions: JSON.parse(permRecord.permissions),
    employee,
  })
})

// POST /api/auth/verify-identity — check username + email match before reset
router.post('/verify-identity', (req, res) => {
  const { username, email } = req.body
  if (!username || !email) return res.status(400).json({ error: 'Username and email are required' })
  const user = db.prepare('SELECT id FROM users WHERE username = ? AND email = ? AND is_active = 1').get(username, email)
  if (!user) return res.status(404).json({ error: 'No account found with that username and email' })
  res.json({ message: 'Identity verified' })
})

// POST /api/auth/reset-password — public, no token needed
router.post('/reset-password', (req, res) => {
  const { username, email, new_password } = req.body
  if (!username || !email || !new_password) {
    return res.status(400).json({ error: 'Username, email, and new password are required' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND email = ? AND is_active = 1').get(username, email)
  if (!user) {
    return res.status(404).json({ error: 'No account found with that username and email combination' })
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), user.id)
  res.json({ message: 'Password reset successfully' })
})

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  const { old_password, new_password } = req.body
  if (!old_password || !new_password) return res.status(400).json({ error: 'Both passwords required' })
  if (!bcrypt.compareSync(old_password, req.user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' })
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id)
  res.json({ message: 'Password changed successfully' })
})

export default router
