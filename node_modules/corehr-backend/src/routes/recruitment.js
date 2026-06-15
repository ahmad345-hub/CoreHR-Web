import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import FormData from 'form-data'
import axios from 'axios'
import { fileURLToPath } from 'url'
import db from '../db/database.js'
import { authenticate, checkPerm } from '../middleware/auth.js'
import { notifyAdmins } from '../services/notifier.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const cvStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/cvs'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `cv_${req.params.id}_${Date.now()}${ext}`)
  },
})
const uploadCV = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, DOC, DOCX files allowed'))
  },
})

const router = Router()
router.use(authenticate)

// ─── Job Postings ─────────────────────────────────────────────
router.get('/postings', checkPerm('recruitment.view'), (req, res) => {
  const { status } = req.query
  let sql = `
    SELECT jp.*, pos.title as position_title, d.name as department_name,
      (SELECT COUNT(*) FROM candidates c WHERE c.posting_id = jp.id) as candidate_count
    FROM job_postings jp
    LEFT JOIN job_positions pos ON jp.job_position_id = pos.id
    LEFT JOIN departments d ON pos.department_id = d.id
    ORDER BY jp.created_at DESC
  `
  const rows = status
    ? db.prepare(sql.replace('ORDER BY', 'WHERE jp.status = ? ORDER BY')).all(status)
    : db.prepare(sql).all()
  res.json(rows)
})

router.post('/postings', checkPerm('recruitment.manage'), (req, res) => {
  const { job_position_id, title, description, vacancies, status, start_date, end_date, company_id } = req.body
  const r = db.prepare(`
    INSERT INTO job_postings (job_position_id, title, description, vacancies, status, start_date, end_date, company_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(job_position_id, title, description, vacancies || 1, status || 'open', start_date, end_date, company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/postings/:id', checkPerm('recruitment.manage'), (req, res) => {
  const { title, description, vacancies, status, end_date } = req.body
  db.prepare('UPDATE job_postings SET title = ?, description = ?, vacancies = ?, status = ?, end_date = ? WHERE id = ?').run(title, description, vacancies, status, end_date, req.params.id)
  res.json({ message: 'Updated' })
})

router.delete('/postings/:id', checkPerm('recruitment.manage'), (req, res) => {
  db.prepare('DELETE FROM job_postings WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Stages ───────────────────────────────────────────────────
router.get('/stages', checkPerm('recruitment.view'), (req, res) => {
  res.json(db.prepare('SELECT * FROM recruitment_stages ORDER BY sort_order').all())
})

router.post('/stages', checkPerm('recruitment.manage'), (req, res) => {
  const { name, sort_order, company_id } = req.body
  const r = db.prepare('INSERT INTO recruitment_stages (name, sort_order, company_id) VALUES (?, ?, ?)').run(name, sort_order || 0, company_id)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.delete('/stages/:id', checkPerm('recruitment.manage'), (req, res) => {
  db.prepare('DELETE FROM recruitment_stages WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// ─── Candidates ───────────────────────────────────────────────
router.get('/candidates', checkPerm('recruitment.view'), (req, res) => {
  const { posting_id, stage_id, status, search, skills } = req.query
  let where = ['1=1']
  const params = []
  if (posting_id) { where.push('c.posting_id = ?'); params.push(posting_id) }
  if (stage_id)   { where.push('c.stage_id = ?'); params.push(stage_id) }
  if (status)     { where.push('c.status = ?'); params.push(status) }
  if (search)     { where.push('(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (skills)     { where.push('c.skills LIKE ?'); params.push(`%${skills}%`) }

  const rows = db.prepare(`
    SELECT c.*,
      rs.name as stage_name,
      jp.title as posting_title
    FROM candidates c
    LEFT JOIN recruitment_stages rs ON c.stage_id = rs.id
    LEFT JOIN job_postings jp ON c.posting_id = jp.id
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC
  `).all(...params)
  res.json(rows)
})

router.post('/candidates', checkPerm('recruitment.manage'), (req, res) => {
  const { name, email, phone, posting_id, stage_id, note, skills } = req.body
  const r = db.prepare(`
    INSERT INTO candidates (name, email, phone, posting_id, stage_id, note, skills, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(name, email, phone, posting_id, stage_id, note, skills)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/candidates/:id', checkPerm('recruitment.manage'), (req, res) => {
  const { name, email, phone, stage_id, status, note, skills } = req.body
  db.prepare('UPDATE candidates SET name = ?, email = ?, phone = ?, stage_id = ?, status = ?, note = ?, skills = ? WHERE id = ?').run(name, email, phone, stage_id, status, note, skills, req.params.id)
  res.json({ message: 'Updated' })
})

router.put('/candidates/:id/move', checkPerm('recruitment.manage'), (req, res) => {
  const { stage_id } = req.body
  db.prepare('UPDATE candidates SET stage_id = ? WHERE id = ?').run(stage_id, req.params.id)
  res.json({ message: 'Stage updated' })
})

router.put('/candidates/:id/hire', checkPerm('recruitment.manage'), (req, res) => {
  db.prepare("UPDATE candidates SET status = 'hired' WHERE id = ?").run(req.params.id)
  const cand = db.prepare('SELECT name FROM candidates WHERE id = ?').get(req.params.id)
  notifyAdmins('Candidate Hired', `${cand?.name || 'A candidate'} has been hired!`, '/recruitment')
  res.json({ message: 'Candidate hired' })
})

router.delete('/candidates/:id', checkPerm('recruitment.manage'), (req, res) => {
  db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id)
  res.json({ message: 'Deleted' })
})

// Helper: submit CV to SharpAPI and poll until done
async function parseWithSharpAPI(filePath, originalName) {
  const apiKey = process.env.SHARPAPI_KEY
  if (!apiKey || apiKey === 'your-sharpapi-key-here') return null

  // Step 1: Submit CV
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), originalName)
  const submit = await axios.post('https://sharpapi.com/api/v1/hr/parse_resume', form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  })

  // SharpAPI returns { status_url, job_id } directly
  const statusUrl = submit.data?.status_url
  if (!statusUrl) return null

  // Step 2: Poll until done (max 12 × 5s = 60s)
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const poll = await axios.get(statusUrl, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    })
    const attrs = poll.data?.data?.attributes
    if (attrs?.status === 'success') {
      // result is a JSON string — parse it
      const raw = typeof attrs.result === 'string' ? JSON.parse(attrs.result) : attrs.result
      return raw
    }
    if (attrs?.status === 'failed') return null
  }
  return null
}

// Helper: extract fields from SharpAPI result
function extractFromParsed(parsed) {
  if (!parsed) return {}

  const name  = parsed.candidate_name || null
  const email = parsed.candidate_email || null
  const phone = parsed.candidate_phone || null

  // Collect skills from all positions + brief_summary tech keywords
  const positionSkills = (parsed.positions || []).flatMap(p => p.skills || [])
  const summarySkills  = extractTechSkills(parsed.brief_summary || '')
  const allSkills      = [...new Set([...positionSkills, ...summarySkills])].filter(Boolean)
  const skills         = allSkills.join(', ')

  return { name, email, phone, skills }
}

// Extract tech skills from summary text
function extractTechSkills(text) {
  const known = ['React','Vue','Angular','Node.js','Node','JavaScript','TypeScript','Python','Java',
    'C#','C++','PHP','Flutter','Dart','MySQL','PostgreSQL','MongoDB','Firebase','SQL',
    'HTML','CSS','Bootstrap','Git','Docker','AWS','Azure','Spring','Laravel','Django',
    'Express','GraphQL','REST','API','Redux','Next.js','Tailwind','Figma']
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return known.filter(s => new RegExp(escape(s), 'i').test(text))
}

// POST /api/recruitment/candidates/:id/cv — upload CV + parse with SharpAPI
router.post('/candidates/:id/cv', checkPerm('recruitment.manage'), (req, res) => {
  uploadCV.single('cv')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const resumeUrl = `/uploads/cvs/${req.file.filename}`
    db.prepare('UPDATE candidates SET resume_url = ? WHERE id = ?').run(resumeUrl, req.params.id)

    // Parse CV with SharpAPI
    try {
      const raw    = await parseWithSharpAPI(req.file.path, req.file.originalname)
      const parsed = extractFromParsed(raw)

      if (parsed.skills) {
        db.prepare('UPDATE candidates SET skills = ? WHERE id = ?').run(parsed.skills, req.params.id)
        return res.json({ resume_url: resumeUrl, parsed: { skills: parsed.skills } })
      }
    } catch (e) {
      console.error('SharpAPI error:', e.message)
    }

    res.json({ resume_url: resumeUrl, parsed: null })
  })
})

// POST /api/recruitment/candidates/:id/parse — re-parse existing CV
router.post('/candidates/:id/parse', checkPerm('recruitment.manage'), async (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id)
  if (!candidate?.resume_url) return res.status(400).json({ error: 'No CV uploaded for this candidate' })

  const __dir    = path.dirname(fileURLToPath(import.meta.url))
  // strip leading slash so path.join works correctly on Windows
  const relative = candidate.resume_url.replace(/^[\\/]/, '')
  const filePath = path.join(__dir, '../../', relative)
  const fileName = path.basename(filePath)
  console.log('Parsing file:', filePath)

  try {
    const raw    = await parseWithSharpAPI(filePath, fileName)
    const parsed = extractFromParsed(raw)
    console.log('Re-parse result:', parsed)

    if (parsed.skills) {
      db.prepare('UPDATE candidates SET skills = ? WHERE id = ?').run(parsed.skills, req.params.id)
      return res.json({ parsed: { skills: parsed.skills } })
    }
    res.json({ parsed: null, message: 'No skills extracted' })
  } catch (e) {
    console.error('Re-parse error:', e.response?.data || e.message)
    res.status(500).json({ error: e.response?.data?.message || e.message })
  }
})

// GET /api/recruitment/debug/sharpapi/:id — test SharpAPI raw response
router.get('/debug/sharpapi/:id', authenticate, async (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id)
  if (!candidate?.resume_url) return res.status(400).json({ error: 'No CV' })

  const __dir    = path.dirname(fileURLToPath(import.meta.url))
  const relative = candidate.resume_url.replace(/^[\\/]/, '')
  const filePath = path.join(__dir, '../../', relative)

  // Check file exists
  if (!fs.existsSync(filePath)) return res.status(400).json({ error: 'File not found on disk', path: filePath })

  const apiKey = process.env.SHARPAPI_KEY
  try {
    // Step 1: Submit
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath), path.basename(filePath))
    const submit = await axios.post('https://sharpapi.com/api/v1/hr/parse_resume', form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
    })
    const statusUrl = submit.data?.data?.attributes?.status_url
    if (!statusUrl) return res.json({ step: 'submit', raw: submit.data })

    // Step 2: poll once after 8s
    await new Promise(r => setTimeout(r, 8000))
    const poll = await axios.get(statusUrl, { headers: { Authorization: `Bearer ${apiKey}` } })
    return res.json({ step: 'poll', statusUrl, raw: poll.data })
  } catch (e) {
    return res.status(500).json({ error: e.response?.data || e.message })
  }
})

// ─── Pipeline (kanban view) ───────────────────────────────────
router.get('/pipeline', checkPerm('recruitment.view'), (req, res) => {
  const stages = db.prepare('SELECT * FROM recruitment_stages ORDER BY sort_order').all()
  const result = stages.map(stage => ({
    ...stage,
    candidates: db.prepare(`
      SELECT c.*, jp.title as posting_title
      FROM candidates c
      LEFT JOIN job_postings jp ON c.posting_id = jp.id
      WHERE c.stage_id = ? AND c.status = 'active'
    `).all(stage.id),
  }))
  res.json(result)
})

export default router
