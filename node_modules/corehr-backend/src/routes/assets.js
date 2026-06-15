import { Router } from 'express'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/categories', checkPerm('assets.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM asset_categories ORDER BY name').all())
})
router.post('/categories', checkPerm('assets.manage'), (req, res) => {
  const { name, description } = req.body
  const r = db.prepare('INSERT INTO asset_categories (name, description) VALUES (?, ?)').run(name, description || null)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/categories/:id', checkPerm('assets.manage'), (req, res) => {
  const { name, description } = req.body
  db.prepare('UPDATE asset_categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/categories/:id', checkPerm('assets.manage'), (req, res) => {
  db.prepare('DELETE FROM asset_categories WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

router.get('/', checkPerm('assets.view'), (req, res) => {
  const { status, category_id, page = 1, limit = 20 } = req.query
  let where = ['1=1']
  const params = []
  if (status)      { where.push('a.status = ?'); params.push(status) }
  if (category_id) { where.push('a.category_id = ?'); params.push(category_id) }

  const offset = (Number(page) - 1) * Number(limit)
  const rows = db.prepare(`
    SELECT a.*, ac.name as category_name,
      (SELECT u.first_name || ' ' || u.last_name
       FROM asset_allocations aa
       LEFT JOIN employees e ON aa.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE aa.asset_id = a.id AND aa.returned_at IS NULL LIMIT 1) as assigned_to_name
    FROM assets a
    LEFT JOIN asset_categories ac ON a.category_id = ac.id
    WHERE ${where.join(' AND ')}
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  const total = db.prepare(`SELECT COUNT(*) as c FROM assets a WHERE ${where.join(' AND ')}`).get(...params).c
  res.json({ results: rows, total, page: Number(page), pages: Math.ceil(total / limit) })
})

router.post('/', checkPerm('assets.manage'), (req, res) => {
  const { name, asset_id, category_id, purchase_date, purchase_cost, status } = req.body
  const emp = db.prepare('SELECT company_id FROM employees WHERE user_id = ?').get(req.user.id)
  const defaultCompany = db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get()
  const company_id = emp?.company_id || defaultCompany?.id || null
  const r = db.prepare(`
    INSERT INTO assets (name, asset_id, category_id, purchase_date, purchase_cost, status, company_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, asset_id || null, category_id || null, purchase_date || null, purchase_cost || null, status || 'available', company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/:id', checkPerm('assets.manage'), (req, res) => {
  const { name, asset_id, category_id, purchase_date, purchase_cost, status } = req.body
  db.prepare(`
    UPDATE assets SET name = ?, asset_id = ?, category_id = ?, purchase_date = ?, purchase_cost = ?, status = ?
    WHERE id = ?
  `).run(name, asset_id, category_id || null, purchase_date || null, purchase_cost || null, status, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/:id', checkPerm('assets.manage'), (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

router.get('/allocations', checkPerm('assets.view'), (req, res) => {
  const rows = db.prepare(`
    SELECT aa.*, aa.assigned_at as allocation_date, aa.returned_at as return_date, aa.note as notes,
      a.name as asset_name, a.asset_id as asset_code,
      u.first_name || ' ' || u.last_name as employee_name
    FROM asset_allocations aa
    LEFT JOIN assets a ON aa.asset_id = a.id
    LEFT JOIN employees e ON aa.employee_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY aa.assigned_at DESC
  `).all()
  res.json(rows)
})

router.post('/allocate', checkPerm('assets.manage'), (req, res) => {
  const { asset_id, employee_id, note } = req.body
  db.prepare("UPDATE assets SET status = 'allocated' WHERE id = ?").run(asset_id)
  const r = db.prepare('INSERT INTO asset_allocations (asset_id, employee_id, note) VALUES (?, ?, ?)').run(asset_id, employee_id, note)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.post('/return/:allocation_id', checkPerm('assets.manage'), (req, res) => {
  const alloc = db.prepare('SELECT * FROM asset_allocations WHERE id = ?').get(req.params.allocation_id)
  if (!alloc) return res.status(404).json({ error: 'Allocation not found' })
  db.prepare('UPDATE asset_allocations SET returned_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.allocation_id)
  db.prepare("UPDATE assets SET status = 'available' WHERE id = ?").run(alloc.asset_id)
  res.json({ message: 'Asset returned' })
})

export default router
