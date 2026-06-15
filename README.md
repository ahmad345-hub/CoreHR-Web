# CoreHR React

A full-stack HR management system built with **React + Vite** (frontend) and **Node.js + Express + SQLite** (backend). It is a complete JavaScript rewrite of the CoreHR Django application, preserving all features.

---

## Quick Start

### 1. Install dependencies

```bash
cd C:\Users\ShareefSalahat\corehr-react

# Install backend deps
cd backend
npm install

# Install frontend deps
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
copy .env.example .env
```

Edit `.env` if needed (defaults work out of the box).

### 3. Create and seed the database

```bash
cd backend
node src/db/setup.js
```

This creates `backend/corehr.db` with all tables and sample data.

### 4. Start both servers

**Option A — double-click `start.bat`** (Windows)

**Option B — two terminals:**
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000**

---

## Login Credentials

| Role       | Username        | Password      |
|------------|-----------------|---------------|
| Admin      | `admin`         | `admin123`    |
| Employee   | `sarah.johnson` | `password123` |

---

## Architecture

```
corehr-react/
├── backend/              # Node.js + Express + SQLite
│   ├── src/
│   │   ├── app.js        # Express app entry point
│   │   ├── db/
│   │   │   ├── database.js   # SQLite connection
│   │   │   └── setup.js      # Schema + seed data
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT authentication
│   │   │   └── errorHandler.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── employees.js
│   │       ├── attendance.js
│   │       ├── leave.js
│   │       ├── recruitment.js
│   │       ├── payroll.js
│   │       ├── dashboard.js
│   │       ├── onboarding.js
│   │       ├── offboarding.js
│   │       ├── performance.js
│   │       ├── helpdesk.js
│   │       ├── assets.js
│   │       ├── projects.js
│   │       ├── settings.js
│   │       ├── notifications.js
│   │       └── reports.js
│   └── package.json
│
└── frontend/             # React 18 + Vite
    ├── src/
    │   ├── api/
    │   │   └── client.js     # Axios instance with JWT interceptor
    │   ├── components/
    │   │   ├── layout/       # Layout, Sidebar, Navbar
    │   │   └── birthday/     # Canvas birthday animation
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── auth/Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── employees/
    │   │   ├── attendance/
    │   │   ├── leave/
    │   │   ├── recruitment/
    │   │   ├── payroll/
    │   │   └── ModulePlaceholder.jsx
    │   ├── styles/
    │   │   └── theme.css     # Donezo green theme
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## Modules

| Module           | Backend API | Frontend UI |
|------------------|:-----------:|:-----------:|
| Authentication   | ✅ | ✅ |
| Dashboard        | ✅ | ✅ |
| Employees        | ✅ | ✅ Full CRUD |
| Attendance       | ✅ | ✅ Clock in/out |
| Leave            | ✅ | ✅ Requests & approvals |
| Recruitment      | ✅ | ✅ Kanban pipeline |
| Payroll          | ✅ | ✅ Payslips & contracts |
| Onboarding       | ✅ | 🔄 Placeholder |
| Offboarding      | ✅ | 🔄 Placeholder |
| Performance      | ✅ | 🔄 Placeholder |
| Helpdesk         | ✅ | 🔄 Placeholder |
| Assets           | ✅ | 🔄 Placeholder |
| Projects         | ✅ | 🔄 Placeholder |
| Reports          | ✅ | 🔄 Placeholder |
| Settings         | ✅ | 🔄 Placeholder |
| Notifications    | ✅ | ✅ Panel in navbar |

> All placeholder modules have complete REST APIs — only the dedicated page UI needs to be built.

---

## Tech Stack

**Frontend:** React 18, React Router v6, Chart.js, Axios, Vite
**Backend:** Node.js, Express 4, better-sqlite3, JWT, bcrypt
**Database:** SQLite (file: `backend/corehr.db`)
**Theme:** Donezo-inspired dark green design system
