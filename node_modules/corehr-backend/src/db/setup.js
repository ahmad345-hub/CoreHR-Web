/**
 * CoreHR Database Setup — creates all tables and seeds sample data.
 * Run: node src/db/setup.js
 */
import db from './database.js'
import bcrypt from 'bcryptjs'

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    address     TEXT,
    country     TEXT DEFAULT 'US',
    industry    TEXT,
    logo_url    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS job_positions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    company_id    INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS work_types (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT NOT NULL UNIQUE,
    email        TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    first_name   TEXT NOT NULL DEFAULT '',
    last_name    TEXT NOT NULL DEFAULT '',
    is_active    INTEGER NOT NULL DEFAULT 1,
    is_staff     INTEGER NOT NULL DEFAULT 0,
    is_superuser INTEGER NOT NULL DEFAULT 0,
    date_joined  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id        TEXT UNIQUE,
    user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    job_position_id INTEGER REFERENCES job_positions(id) ON DELETE SET NULL,
    department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    company_id      INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    work_type_id    INTEGER REFERENCES work_types(id) ON DELETE SET NULL,
    shift_id        INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
    date_joining    TEXT,
    contract_end    TEXT,
    salary          REAL DEFAULT 0,
    phone           TEXT,
    address         TEXT,
    city            TEXT,
    country         TEXT DEFAULT 'US',
    gender          TEXT CHECK(gender IN ('male','female','other')) DEFAULT 'male',
    dob             TEXT,
    photo_url       TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date          TEXT NOT NULL,
    check_in      TEXT,
    check_out     TEXT,
    worked_hours  REAL DEFAULT 0,
    status        TEXT DEFAULT 'present' CHECK(status IN ('present','absent','half_day','on_leave')),
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leave_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    total_days      REAL DEFAULT 0,
    carryforward    INTEGER DEFAULT 0,
    paid            INTEGER DEFAULT 1,
    company_id      INTEGER REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS leave_allocations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    total_days    REAL DEFAULT 0,
    used_days     REAL DEFAULT 0,
    year          INTEGER DEFAULT (strftime('%Y', 'now'))
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date    TEXT NOT NULL,
    end_date      TEXT NOT NULL,
    days          REAL DEFAULT 1,
    reason        TEXT,
    status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
    approved_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at   TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS job_postings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_position_id INTEGER REFERENCES job_positions(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    vacancies       INTEGER DEFAULT 1,
    status          TEXT DEFAULT 'open' CHECK(status IN ('open','closed','draft')),
    start_date      TEXT,
    end_date        TEXT,
    company_id      INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recruitment_stages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    email        TEXT,
    phone        TEXT,
    posting_id   INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
    stage_id     INTEGER REFERENCES recruitment_stages(id) ON DELETE SET NULL,
    status       TEXT DEFAULT 'active' CHECK(status IN ('active','hired','rejected','withdrawn')),
    resume_url   TEXT,
    note         TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_type   TEXT DEFAULT 'permanent',
    start_date      TEXT NOT NULL,
    end_date        TEXT,
    wage            REAL DEFAULT 0,
    pay_frequency   TEXT DEFAULT 'monthly',
    status          TEXT DEFAULT 'active' CHECK(status IN ('active','expired','terminated')),
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS allowances (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    amount      REAL DEFAULT 0,
    is_percent  INTEGER DEFAULT 0,
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deductions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    amount      REAL DEFAULT 0,
    is_percent  INTEGER DEFAULT 0,
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payslips (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_id   INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    period_start  TEXT NOT NULL,
    period_end    TEXT NOT NULL,
    basic_pay     REAL DEFAULT 0,
    allowances    REAL DEFAULT 0,
    deductions    REAL DEFAULT 0,
    net_pay       REAL DEFAULT 0,
    status        TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','paid')),
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    sort_order  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS onboarding_records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    task_id     INTEGER NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
    status      TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS offboarding_tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    sort_order  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS offboarding_records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    task_id     INTEGER NOT NULL REFERENCES offboarding_tasks(id) ON DELETE CASCADE,
    status      TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    exit_date   TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS performance_goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    progress    INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    to_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    rating       INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment      TEXT,
    period       TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS helpdesk_categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS helpdesk_tickets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT,
    employee_id  INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    category_id  INTEGER REFERENCES helpdesk_categories(id) ON DELETE SET NULL,
    priority     TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    status       TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
    assigned_to  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TEXT DEFAULT (datetime('now')),
    resolved_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS asset_categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    asset_id     TEXT UNIQUE,
    category_id  INTEGER REFERENCES asset_categories(id) ON DELETE SET NULL,
    purchase_date TEXT,
    purchase_cost REAL DEFAULT 0,
    status       TEXT DEFAULT 'available' CHECK(status IN ('available','allocated','maintenance','retired')),
    company_id   INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS asset_allocations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id    INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_at TEXT DEFAULT (datetime('now')),
    returned_at TEXT,
    note        TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    start_date  TEXT,
    end_date    TEXT,
    status      TEXT DEFAULT 'active' CHECK(status IN ('active','completed','on_hold','cancelled')),
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    priority    TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    status      TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','review','done')),
    due_date    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    task_id     INTEGER REFERENCES project_tasks(id) ON DELETE SET NULL,
    date        TEXT NOT NULL,
    hours       REAL DEFAULT 0,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    date       TEXT NOT NULL,
    recurring  INTEGER DEFAULT 0,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT,
    is_read     INTEGER DEFAULT 0,
    url         TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    permissions TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );
`)

console.log('✅ Schema created')

// ─── Migrations (add columns to existing DBs) ────────────────────────────────
try { db.exec('ALTER TABLE companies ADD COLUMN phone TEXT') } catch {}
try { db.exec('ALTER TABLE companies ADD COLUMN email TEXT') } catch {}
try { db.exec('ALTER TABLE holidays ADD COLUMN recurring INTEGER DEFAULT 0') } catch {}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const existing = db.prepare('SELECT COUNT(*) as c FROM users').get()
if (existing.c > 0) {
  console.log('ℹ️  Database already seeded — skipping.')
  process.exit(0)
}

// Company
const companyId = db.prepare(`
  INSERT INTO companies (name, address, country, industry)
  VALUES ('CoreHR Inc.', '123 Main St, New York, NY 10001', 'US', 'Technology')
`).run().lastInsertRowid

// Departments
const depts = ['Engineering', 'Human Resources', 'Marketing', 'Sales', 'Finance', 'Operations']
const deptIds = depts.map(name =>
  db.prepare('INSERT INTO departments (name, company_id) VALUES (?, ?)').run(name, companyId).lastInsertRowid
)

// Job Positions
const positions = [
  ['Software Engineer', 0], ['Senior Engineer', 0], ['DevOps Engineer', 0],
  ['HR Manager', 1], ['Recruiter', 1], ['HR Specialist', 1],
  ['Marketing Manager', 2], ['Content Writer', 2],
  ['Sales Manager', 3], ['Sales Rep', 3],
  ['CFO', 4], ['Accountant', 4],
  ['Operations Manager', 5],
]
const posIds = positions.map(([title, di]) =>
  db.prepare('INSERT INTO job_positions (title, department_id, company_id) VALUES (?, ?, ?)').run(title, deptIds[di], companyId).lastInsertRowid
)

// Work Types & Shifts
const wtId = db.prepare('INSERT INTO work_types (name) VALUES (?)').run('On-site').lastInsertRowid
const wfhId = db.prepare('INSERT INTO work_types (name) VALUES (?)').run('Remote').lastInsertRowid
const hybridId = db.prepare('INSERT INTO work_types (name) VALUES (?)').run('Hybrid').lastInsertRowid

const shift1 = db.prepare('INSERT INTO shifts (name, start_time, end_time, company_id) VALUES (?, ?, ?, ?)').run('Morning Shift', '08:00', '17:00', companyId).lastInsertRowid
const shift2 = db.prepare('INSERT INTO shifts (name, start_time, end_time, company_id) VALUES (?, ?, ?, ?)').run('Evening Shift', '14:00', '23:00', companyId).lastInsertRowid

// Superuser / Admin
const adminPwd = bcrypt.hashSync('admin123', 10)
const adminUserId = db.prepare(`
  INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
  VALUES ('admin', 'admin@corehr.com', ?, 'Admin', 'User', 1, 1)
`).run(adminPwd).lastInsertRowid

// Sample Employees
const sampleEmployees = [
  { first: 'Sarah',   last: 'Johnson',  email: 'sarah.johnson@corehr.com',  dept: 1, pos: 3,  pos_i: 3,  gender: 'female' },
  { first: 'Michael', last: 'Chen',     email: 'michael.chen@corehr.com',   dept: 0, pos: 0,  pos_i: 0,  gender: 'male'   },
  { first: 'Emma',    last: 'Williams', email: 'emma.williams@corehr.com',  dept: 2, pos: 6,  pos_i: 6,  gender: 'female' },
  { first: 'James',   last: 'Brown',    email: 'james.brown@corehr.com',    dept: 3, pos: 8,  pos_i: 8,  gender: 'male'   },
  { first: 'Olivia',  last: 'Davis',    email: 'olivia.davis@corehr.com',   dept: 4, pos: 10, pos_i: 10, gender: 'female' },
  { first: 'William', last: 'Martinez', email: 'william.m@corehr.com',      dept: 0, pos: 1,  pos_i: 1,  gender: 'male'   },
  { first: 'Sophia',  last: 'Anderson', email: 'sophia.a@corehr.com',       dept: 1, pos: 4,  pos_i: 4,  gender: 'female' },
  { first: 'Liam',    last: 'Taylor',   email: 'liam.taylor@corehr.com',    dept: 0, pos: 2,  pos_i: 2,  gender: 'male'   },
  { first: 'Ava',     last: 'Thomas',   email: 'ava.thomas@corehr.com',     dept: 2, pos: 7,  pos_i: 7,  gender: 'female' },
  { first: 'Noah',    last: 'Jackson',  email: 'noah.jackson@corehr.com',   dept: 3, pos: 9,  pos_i: 9,  gender: 'male'   },
  { first: 'Isabella',last: 'White',    email: 'isabella.w@corehr.com',     dept: 4, pos: 11, pos_i: 11, gender: 'female' },
  { first: 'Ethan',   last: 'Harris',   email: 'ethan.harris@corehr.com',   dept: 5, pos: 12, pos_i: 12, gender: 'male'   },
]

const empIds = []
sampleEmployees.forEach((e, i) => {
  const pwd = bcrypt.hashSync('password123', 10)
  const userId = db.prepare(`
    INSERT INTO users (username, email, password, first_name, last_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(`${e.first.toLowerCase()}.${e.last.toLowerCase()}`, e.email, pwd, e.first, e.last).lastInsertRowid

  const empId = db.prepare(`
    INSERT INTO employees (badge_id, user_id, job_position_id, department_id, company_id,
      work_type_id, shift_id, date_joining, salary, gender, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    `EMP-${String(i + 1).padStart(3, '0')}`,
    userId, posIds[e.pos_i], deptIds[e.dept], companyId,
    i % 3 === 0 ? wtId : i % 3 === 1 ? wfhId : hybridId,
    i % 2 === 0 ? shift1 : shift2,
    `2022-${String((i % 12) + 1).padStart(2, '0')}-15`,
    50000 + i * 5000,
    e.gender
  ).lastInsertRowid

  empIds.push(empId)
})

// Leave Types
const leaveTypes = [
  ['Annual Leave', 20, 1, 1],
  ['Sick Leave', 10, 0, 1],
  ['Casual Leave', 7, 0, 1],
  ['Maternity Leave', 90, 0, 1],
  ['Unpaid Leave', 30, 0, 0],
]
const ltIds = leaveTypes.map(([name, days, carry, paid]) =>
  db.prepare('INSERT INTO leave_types (name, total_days, carryforward, paid, company_id) VALUES (?, ?, ?, ?, ?)').run(name, days, carry, paid, companyId).lastInsertRowid
)

// Leave Allocations for each employee
empIds.forEach(empId => {
  ltIds.slice(0, 3).forEach((ltId, i) => {
    db.prepare(`
      INSERT INTO leave_allocations (employee_id, leave_type_id, total_days, used_days)
      VALUES (?, ?, ?, ?)
    `).run(empId, ltId, leaveTypes[i][1], Math.floor(Math.random() * 5))
  })
})

// Leave Requests
const leaveStatuses = ['approved', 'pending', 'rejected', 'approved', 'approved']
empIds.slice(0, 5).forEach((empId, i) => {
  db.prepare(`
    INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(empId, ltIds[i % ltIds.length], '2025-02-10', '2025-02-12', 2, 'Personal reasons', leaveStatuses[i])
})

// Attendance (last 7 days)
const today = new Date()
empIds.forEach(empId => {
  for (let d = 0; d < 7; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    const dateStr = date.toISOString().slice(0, 10)
    const skip = Math.random() < 0.1
    if (!skip) {
      db.prepare(`
        INSERT INTO attendance (employee_id, date, check_in, check_out, worked_hours, status)
        VALUES (?, ?, ?, ?, ?, 'present')
      `).run(empId, dateStr, '08:30', '17:30', 8.5)
    }
  }
})

// Job Postings
const jPostings = [
  ['Senior React Developer', 0, 3],
  ['DevOps Specialist', 0, 2],
  ['Marketing Coordinator', 2, 1],
]
const postingIds = jPostings.map(([title, pi, vacancies]) =>
  db.prepare(`
    INSERT INTO job_postings (job_position_id, title, description, vacancies, status, company_id, start_date, end_date)
    VALUES (?, ?, ?, ?, 'open', ?, date('now'), date('now', '+60 days'))
  `).run(posIds[pi], title, `We are looking for a talented ${title}.`, vacancies, companyId).lastInsertRowid
)

// Recruitment Stages
const stageNames = ['Applied', 'Screening', 'Interview', 'Technical', 'Offer', 'Hired']
const stageIds = stageNames.map((name, i) =>
  db.prepare('INSERT INTO recruitment_stages (name, sort_order, company_id) VALUES (?, ?, ?)').run(name, i, companyId).lastInsertRowid
)

// Candidates
const candidateNames = [
  'Alex Thompson', 'Jordan Lee', 'Casey Morgan', 'Riley Parker',
  'Morgan Smith', 'Avery Jones', 'Taylor Brown',
]
candidateNames.forEach((name, i) => {
  db.prepare(`
    INSERT INTO candidates (name, email, phone, posting_id, stage_id, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(name, `${name.replace(' ', '.').toLowerCase()}@email.com`, `555-01${String(i).padStart(2, '0')}`,
    postingIds[i % postingIds.length], stageIds[i % (stageIds.length - 1)])
})

// Contracts
empIds.forEach((empId, i) => {
  db.prepare(`
    INSERT INTO contracts (employee_id, contract_type, start_date, wage, pay_frequency, status)
    VALUES (?, 'permanent', ?, ?, 'monthly', 'active')
  `).run(empId, `2022-${String((i % 12) + 1).padStart(2, '0')}-15`, 50000 + i * 5000)
})

// Payslips (last 3 months)
empIds.forEach((empId, i) => {
  for (let m = 0; m < 3; m++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - m)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const basic = 50000 + i * 5000
    const allow = basic * 0.15
    const ded = basic * 0.05
    db.prepare(`
      INSERT INTO payslips (employee_id, period_start, period_end, basic_pay, allowances, deductions, net_pay, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(empId, `${y}-${mo}-01`, `${y}-${mo}-28`, basic, allow, ded, basic + allow - ded,
      m === 0 ? 'draft' : 'paid')
  }
})

// Assets
const assetCat1 = db.prepare('INSERT INTO asset_categories (name) VALUES (?)').run('Laptop').lastInsertRowid
const assetCat2 = db.prepare('INSERT INTO asset_categories (name) VALUES (?)').run('Phone').lastInsertRowid
const assetCat3 = db.prepare('INSERT INTO asset_categories (name) VALUES (?)').run('Monitor').lastInsertRowid

const assetList = [
  ['MacBook Pro 14"', 'ASSET-001', assetCat1, 2499],
  ['MacBook Air M2', 'ASSET-002', assetCat1, 1299],
  ['iPhone 15 Pro', 'ASSET-003', assetCat2, 999],
  ['Dell Monitor 27"', 'ASSET-004', assetCat3, 499],
  ['MacBook Pro 16"', 'ASSET-005', assetCat1, 3499],
  ['Samsung Galaxy S24', 'ASSET-006', assetCat2, 899],
]
const assetIds = assetList.map(([name, aid, cat, cost]) =>
  db.prepare(`
    INSERT INTO assets (name, asset_id, category_id, purchase_date, purchase_cost, status, company_id)
    VALUES (?, ?, ?, date('now', '-200 days'), ?, 'allocated', ?)
  `).run(name, aid, cat, cost, companyId).lastInsertRowid
)

assetIds.forEach((assetId, i) => {
  db.prepare(`
    INSERT INTO asset_allocations (asset_id, employee_id, note)
    VALUES (?, ?, 'Initial allocation')
  `).run(assetId, empIds[i % empIds.length])
})

// Projects
const proj1 = db.prepare(`
  INSERT INTO projects (name, description, start_date, end_date, status, company_id)
  VALUES ('CoreHR Redesign', 'Complete UI/UX overhaul of the HR platform', date('now', '-30 days'), date('now', '+60 days'), 'active', ?)
`).run(companyId).lastInsertRowid

const proj2 = db.prepare(`
  INSERT INTO projects (name, description, start_date, end_date, status, company_id)
  VALUES ('Q1 Marketing Campaign', 'Multi-channel marketing campaign for Q1', date('now', '-10 days'), date('now', '+50 days'), 'active', ?)
`).run(companyId).lastInsertRowid

const taskStatuses = ['todo', 'in_progress', 'review', 'done']
const taskNames = ['Design mockups', 'API integration', 'Testing', 'Code review', 'Documentation', 'Deployment']
taskNames.forEach((title, i) => {
  db.prepare(`
    INSERT INTO project_tasks (project_id, title, assigned_to, priority, status, due_date)
    VALUES (?, ?, ?, 'medium', ?, date('now', ? || ' days'))
  `).run(proj1, title, empIds[i % empIds.length], taskStatuses[i % 4], `+${(i + 1) * 5}`)
})

// Onboarding Tasks
const onboardingTaskList = [
  'Complete personal information form',
  'Set up company email',
  'Review company policies',
  'Meet with IT for equipment setup',
  'Introduction to team members',
  'Complete mandatory training',
]
const obTaskIds = onboardingTaskList.map((title, i) =>
  db.prepare('INSERT INTO onboarding_tasks (title, company_id, sort_order) VALUES (?, ?, ?)').run(title, companyId, i).lastInsertRowid
)

// Offboarding Tasks
const offboardingTaskList = [
  'Return company assets',
  'Complete knowledge transfer',
  'Conduct exit interview',
  'Revoke system access',
  'Final payroll processing',
]
offboardingTaskList.forEach((title, i) =>
  db.prepare('INSERT INTO offboarding_tasks (title, company_id, sort_order) VALUES (?, ?, ?)').run(title, companyId, i)
)

// Helpdesk Categories & Tickets
const hCat1 = db.prepare('INSERT INTO helpdesk_categories (name) VALUES (?)').run('IT Support').lastInsertRowid
const hCat2 = db.prepare('INSERT INTO helpdesk_categories (name) VALUES (?)').run('HR Queries').lastInsertRowid
const hCat3 = db.prepare('INSERT INTO helpdesk_categories (name) VALUES (?)').run('Facilities').lastInsertRowid

const tickets = [
  ['VPN not working', 'Cannot connect to VPN from home', hCat1, 'high', 'open'],
  ['Payslip discrepancy', 'My November payslip amount seems incorrect', hCat2, 'medium', 'in_progress'],
  ['Office chair broken', 'My office chair armrest is broken', hCat3, 'low', 'open'],
  ['Password reset needed', 'Locked out of company email', hCat1, 'urgent', 'resolved'],
  ['Leave policy question', 'How many days can I carry forward?', hCat2, 'low', 'resolved'],
]
tickets.forEach(([title, desc, cat, prio, status], i) => {
  db.prepare(`
    INSERT INTO helpdesk_tickets (title, description, employee_id, category_id, priority, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, desc, empIds[i % empIds.length], cat, prio, status)
})

// Performance Goals
const goals = [
  ['Complete React certification', 'Earn official React developer certification'],
  ['Improve team velocity by 20%', 'Implement agile best practices'],
  ['Reduce customer churn by 10%', 'Proactive outreach campaign'],
]
goals.forEach(([title, desc], i) => {
  db.prepare(`
    INSERT INTO performance_goals (employee_id, title, description, target_date, progress, status)
    VALUES (?, ?, ?, date('now', '+90 days'), ?, 'active')
  `).run(empIds[i], title, desc, Math.floor(Math.random() * 80) + 10)
})

// Holidays
const holidays_list = [
  ['New Year\'s Day', '2025-01-01'],
  ['Independence Day', '2025-07-04'],
  ['Thanksgiving', '2025-11-27'],
  ['Christmas Day', '2025-12-25'],
]
holidays_list.forEach(([name, date]) =>
  db.prepare('INSERT INTO holidays (name, date, company_id) VALUES (?, ?, ?)').run(name, date, companyId)
)

// Notifications for admin
const notifMessages = [
  ['New Leave Request', 'Sarah Johnson has submitted a leave request for approval'],
  ['Attendance Alert', '3 employees marked absent today'],
  ['Contract Expiry', 'Michael Chen\'s contract expires in 30 days'],
  ['New Candidate', 'A new candidate applied for Senior React Developer'],
]
notifMessages.forEach(([title, message]) => {
  db.prepare(`
    INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)
  `).run(adminUserId, title, message)
})

console.log('✅ Seed data inserted successfully')
console.log('')
console.log('  Admin login:')
console.log('    Username: admin')
console.log('    Password: admin123')
console.log('')
console.log('  Sample employee login:')
console.log('    Username: sarah.johnson')
console.log('    Password: password123')
