import jwt from 'jsonwebtoken'
import db from '../db/database.js'
import { getDefaultPermissions } from '../routes/permissions.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'corehr-secret')
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.userId)
    if (!user) return res.status(401).json({ error: 'User not found or inactive' })
    req.user = user
    req.user.role = user.is_superuser ? 'admin' : user.is_staff ? 'manager' : 'employee'

    // Load permissions
    const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(user.id)
    if (permRecord) {
      req.userPermissions = JSON.parse(permRecord.permissions)
    } else {
      req.userPermissions = getDefaultPermissions(req.user.role)
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireStaff(req, res, next) {
  if (!req.user.is_staff && !req.user.is_superuser) {
    return res.status(403).json({ error: 'Staff access required' })
  }
  next()
}

// Check specific permission key
export function checkPerm(...permKeys) {
  return (req, res, next) => {
    // Super admin always passes
    if (req.user.is_superuser) return next()

    const perms = req.userPermissions || {}
    const hasPermission = permKeys.some(key => perms[key] === true)

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' })
    }
    next()
  }
}
