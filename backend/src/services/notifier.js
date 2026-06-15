import db from '../db/database.js'

export function notify(userId, title, message, url) {
  db.prepare('INSERT INTO notifications (user_id, title, message, url) VALUES (?, ?, ?, ?)').run(userId, title, message, url || null)
}

export function notifyAdmins(title, message, url) {
  const admins = db.prepare('SELECT id FROM users WHERE is_superuser = 1 AND is_active = 1').all()
  admins.forEach(a => notify(a.id, title, message, url))
}

export function notifyManagers(title, message, url) {
  const managers = db.prepare('SELECT id FROM users WHERE (is_staff = 1 OR is_superuser = 1) AND is_active = 1').all()
  managers.forEach(m => notify(m.id, title, message, url))
}

export function notifyEmployee(userId, title, message, url) {
  notify(userId, title, message, url)
}
