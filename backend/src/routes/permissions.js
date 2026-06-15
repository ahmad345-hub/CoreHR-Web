import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// All permission keys
const ALL_PERMISSION_KEYS = [
  'dashboard',
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
  'attendance.view', 'attendance.clock', 'attendance.manage',
  'leave.view', 'leave.apply', 'leave.approve', 'leave.manage_types',
  'payroll.view', 'payroll.manage',
  'recruitment.view', 'recruitment.manage',
  'onboarding.view', 'onboarding.manage',
  'offboarding.view', 'offboarding.manage',
  'performance.view', 'performance.manage',
  'helpdesk.view', 'helpdesk.create', 'helpdesk.manage',
  'assets.view', 'assets.manage',
  'projects.view', 'projects.manage',
  'reports.view',
  'settings.view', 'settings.manage',
]

export function getDefaultPermissions(role) {
  const perms = {}
  ALL_PERMISSION_KEYS.forEach(k => { perms[k] = false })

  if (role === 'admin') {
    ALL_PERMISSION_KEYS.forEach(k => { perms[k] = true })
  } else if (role === 'manager') {
    const trueKeys = [
      'dashboard',
      'employees.view',
      'attendance.view', 'attendance.clock', 'attendance.manage',
      'leave.view', 'leave.apply', 'leave.approve',
      'payroll.view',
      'recruitment.view', 'recruitment.manage',
      'onboarding.view', 'onboarding.manage',
      'offboarding.view', 'offboarding.manage',
      'performance.view', 'performance.manage',
      'helpdesk.view', 'helpdesk.create', 'helpdesk.manage',
      'assets.view',
      'projects.view', 'projects.manage',
      'reports.view',
    ]
    trueKeys.forEach(k => { perms[k] = true })
  } else {
    const trueKeys = [
      'dashboard',
      'attendance.view', 'attendance.clock',
      'leave.view', 'leave.apply',
      'payroll.view',
      'performance.view',
      'helpdesk.view', 'helpdesk.create',
      'projects.view',
    ]
    trueKeys.forEach(k => { perms[k] = true })
  }

  return perms
}

// Helper: get user role from flags
function getUserRole(user) {
  return user.is_superuser ? 'admin' : user.is_staff ? 'manager' : 'employee'
}

// Helper: get or create user permissions
function getOrCreatePermissions(userId) {
  let record = db.prepare('SELECT * FROM user_permissions WHERE user_id = ?').get(userId)
  if (!record) {
    const user = db.prepare('SELECT is_staff, is_superuser FROM users WHERE id = ?').get(userId)
    if (!user) return null
    const role = user.is_superuser ? 'admin' : user.is_staff ? 'manager' : 'employee'
    const defaults = getDefaultPermissions(role)
    db.prepare('INSERT INTO user_permissions (user_id, permissions) VALUES (?, ?)').run(userId, JSON.stringify(defaults))
    record = db.prepare('SELECT * FROM user_permissions WHERE user_id = ?').get(userId)
  }
  return record
}

// Middleware: only superuser can manage permissions
function requireSuperuser(req, res, next) {
  if (!req.user.is_superuser) {
    return res.status(403).json({ error: 'Super Admin access required' })
  }
  next()
}

// GET /api/permissions/all-permissions
router.get('/all-permissions', authenticate, requireSuperuser, (req, res) => {
  const permissions = [
    { key: 'dashboard', label_en: 'Dashboard', label_ar: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', category: 'main' },
    { key: 'employees.view', label_en: 'View Employees', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646', category: 'workforce' },
    { key: 'employees.create', label_en: 'Create Employees', label_ar: '\u0625\u0646\u0634\u0627\u0621 \u0645\u0648\u0638\u0641\u064a\u0646', category: 'workforce' },
    { key: 'employees.edit', label_en: 'Edit Employees', label_ar: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646', category: 'workforce' },
    { key: 'employees.delete', label_en: 'Delete Employees', label_ar: '\u062d\u0630\u0641 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646', category: 'workforce' },
    { key: 'attendance.view', label_en: 'View Attendance', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u062d\u0636\u0648\u0631', category: 'workforce' },
    { key: 'attendance.clock', label_en: 'Clock In/Out', label_ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062d\u0636\u0648\u0631', category: 'workforce' },
    { key: 'attendance.manage', label_en: 'Manage Attendance', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0636\u0648\u0631', category: 'workforce' },
    { key: 'leave.view', label_en: 'View Leave', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a', category: 'workforce' },
    { key: 'leave.apply', label_en: 'Apply Leave', label_ar: '\u0637\u0644\u0628 \u0625\u062c\u0627\u0632\u0629', category: 'workforce' },
    { key: 'leave.approve', label_en: 'Approve/Reject Leave', label_ar: '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a', category: 'workforce' },
    { key: 'leave.manage_types', label_en: 'Manage Leave Types', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a', category: 'workforce' },
    { key: 'payroll.view', label_en: 'View Payroll', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0631\u0648\u0627\u062a\u0628', category: 'finance' },
    { key: 'payroll.manage', label_en: 'Manage Payroll', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0631\u0648\u0627\u062a\u0628', category: 'finance' },
    { key: 'recruitment.view', label_en: 'View Recruitment', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0648\u0638\u064a\u0641', category: 'talent' },
    { key: 'recruitment.manage', label_en: 'Manage Recruitment', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u0648\u0638\u064a\u0641', category: 'talent' },
    { key: 'onboarding.view', label_en: 'View Onboarding', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0623\u0647\u064a\u0644', category: 'talent' },
    { key: 'onboarding.manage', label_en: 'Manage Onboarding', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u0623\u0647\u064a\u0644', category: 'talent' },
    { key: 'offboarding.view', label_en: 'View Offboarding', label_ar: '\u0639\u0631\u0636 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062e\u062f\u0645\u0629', category: 'talent' },
    { key: 'offboarding.manage', label_en: 'Manage Offboarding', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062e\u062f\u0645\u0629', category: 'talent' },
    { key: 'performance.view', label_en: 'View Performance', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0623\u062f\u0627\u0621', category: 'talent' },
    { key: 'performance.manage', label_en: 'Manage Performance', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u062f\u0627\u0621', category: 'talent' },
    { key: 'helpdesk.view', label_en: 'View Helpdesk', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u062f\u0639\u0645', category: 'operations' },
    { key: 'helpdesk.create', label_en: 'Create Tickets', label_ar: '\u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0627\u0643\u0631', category: 'operations' },
    { key: 'helpdesk.manage', label_en: 'Manage Helpdesk', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062f\u0639\u0645', category: 'operations' },
    { key: 'assets.view', label_en: 'View Assets', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0623\u0635\u0648\u0644', category: 'operations' },
    { key: 'assets.manage', label_en: 'Manage Assets', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0635\u0648\u0644', category: 'operations' },
    { key: 'projects.view', label_en: 'View Projects', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639', category: 'operations' },
    { key: 'projects.manage', label_en: 'Manage Projects', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639', category: 'operations' },
    { key: 'reports.view', label_en: 'View Reports', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631', category: 'analytics' },
    { key: 'settings.view', label_en: 'View Settings', label_ar: '\u0639\u0631\u0636 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', category: 'system' },
    { key: 'settings.manage', label_en: 'Manage Settings', label_ar: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', category: 'system' },
  ]
  res.json(permissions)
})

// GET /api/permissions/users
router.get('/users', authenticate, requireSuperuser, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.first_name, u.last_name, u.is_staff, u.is_superuser, u.is_active,
           d.name as department,
           up.permissions
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN user_permissions up ON up.user_id = u.id
    ORDER BY u.id ASC
  `).all()

  const result = users.map(u => {
    const role = getUserRole(u)
    return {
      id: u.id,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      role,
      is_active: u.is_active,
      department: u.department || null,
      permissions: u.permissions ? JSON.parse(u.permissions) : getDefaultPermissions(role),
    }
  })

  res.json(result)
})

// GET /api/permissions/user/:userId
router.get('/user/:userId', authenticate, requireSuperuser, (req, res) => {
  const { userId } = req.params
  const user = db.prepare('SELECT id, is_staff, is_superuser FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const record = getOrCreatePermissions(user.id)
  res.json({ user_id: user.id, permissions: JSON.parse(record.permissions) })
})

// PUT /api/permissions/user/:userId
router.put('/user/:userId', authenticate, requireSuperuser, (req, res) => {
  const { userId } = req.params
  const { permissions } = req.body

  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'permissions object is required' })
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const existing = db.prepare('SELECT id FROM user_permissions WHERE user_id = ?').get(userId)
  const permsJson = JSON.stringify(permissions)

  if (existing) {
    db.prepare('UPDATE user_permissions SET permissions = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(permsJson, userId)
  } else {
    db.prepare('INSERT INTO user_permissions (user_id, permissions) VALUES (?, ?)').run(userId, permsJson)
  }

  res.json({ message: 'Permissions updated successfully', permissions })
})

// POST /api/permissions/role-defaults/:userId
router.post('/role-defaults/:userId', authenticate, requireSuperuser, (req, res) => {
  const { userId } = req.params
  const { role } = req.body

  const validRoles = ['admin', 'manager', 'employee']
  const user = db.prepare('SELECT id, is_staff, is_superuser FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const targetRole = validRoles.includes(role) ? role : getUserRole(user)
  const defaults = getDefaultPermissions(targetRole)
  const permsJson = JSON.stringify(defaults)

  const existing = db.prepare('SELECT id FROM user_permissions WHERE user_id = ?').get(userId)
  if (existing) {
    db.prepare('UPDATE user_permissions SET permissions = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(permsJson, userId)
  } else {
    db.prepare('INSERT INTO user_permissions (user_id, permissions) VALUES (?, ?)').run(userId, permsJson)
  }

  res.json({ message: 'Role defaults applied', permissions: defaults })
})

export default router
export { ALL_PERMISSION_KEYS }
