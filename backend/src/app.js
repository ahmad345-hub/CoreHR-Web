import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import employeeRoutes from './routes/employees.js'
import attendanceRoutes from './routes/attendance.js'
import leaveRoutes from './routes/leave.js'
import recruitmentRoutes from './routes/recruitment.js'
import payrollRoutes from './routes/payroll.js'
import dashboardRoutes from './routes/dashboard.js'
import onboardingRoutes from './routes/onboarding.js'
import offboardingRoutes from './routes/offboarding.js'
import performanceRoutes from './routes/performance.js'
import helpdeskRoutes from './routes/helpdesk.js'
import assetRoutes from './routes/assets.js'
import projectRoutes from './routes/projects.js'
import settingsRoutes from './routes/settings.js'
import notificationRoutes from './routes/notifications.js'
import reportRoutes from './routes/reports.js'
import permissionRoutes from './routes/permissions.js'
import insightRoutes from './routes/insights.js'
import chatbotRoutes from './routes/chatbot.js'
import { errorHandler } from './middleware/errorHandler.js'
import db from './db/database.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 5000

// ─── Socket.io Messaging ──────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

// userId (string) → socketId
const onlineUsers = new Map()

io.on('connection', socket => {
  socket.on('register', ({ userId }) => {
    onlineUsers.set(String(userId), socket.id)
    socket.userId = String(userId)
  })

  // Send message: store in DB then push to receiver if online
  socket.on('send-message', ({ senderId, receiverId, message }) => {
    const result = db.prepare(
      'INSERT INTO direct_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)'
    ).run(senderId, receiverId, message)

    const msg = db.prepare(`
      SELECT dm.*, u.first_name || ' ' || u.last_name as sender_name
      FROM direct_messages dm
      LEFT JOIN users u ON dm.sender_id = u.id
      WHERE dm.id = ?
    `).get(result.lastInsertRowid)

    // Push to receiver if online
    const receiverSocket = onlineUsers.get(String(receiverId))
    if (receiverSocket) io.to(receiverSocket).emit('new-message', msg)

    // Confirm to sender
    socket.emit('message-sent', msg)
  })

  // Mark messages as read
  socket.on('mark-read', ({ fromUserId, toUserId }) => {
    db.prepare(
      'UPDATE direct_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?'
    ).run(fromUserId, toUserId)
  })

  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId)
  })
})

// ─── Express Middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin === (process.env.FRONTEND_URL || 'http://localhost:3000')) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/leave', leaveRoutes)
app.use('/api/recruitment', recruitmentRoutes)
app.use('/api/payroll', payrollRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/offboarding', offboardingRoutes)
app.use('/api/performance', performanceRoutes)
app.use('/api/helpdesk', helpdeskRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/permissions', permissionRoutes)
app.use('/api/insights', insightRoutes)
app.use('/api/chatbot', chatbotRoutes)

// ─── Messages API ─────────────────────────────────────────────
import { authenticate } from './middleware/auth.js'

// GET /api/messages/:otherId — conversation history
app.get('/api/messages/:otherId', authenticate, (req, res) => {
  const me = req.user.id
  const other = req.params.otherId
  const msgs = db.prepare(`
    SELECT dm.*, u.first_name || ' ' || u.last_name as sender_name
    FROM direct_messages dm
    LEFT JOIN users u ON dm.sender_id = u.id
    WHERE (dm.sender_id = ? AND dm.receiver_id = ?)
       OR (dm.sender_id = ? AND dm.receiver_id = ?)
    ORDER BY dm.created_at ASC
  `).all(me, other, other, me)
  res.json(msgs)
})

// GET /api/messages/conversations/list — admin: list all employees who messaged
app.get('/api/messages/conversations/list', authenticate, (req, res) => {
  if (!req.user.is_superuser) return res.status(403).json({ error: 'Admin only' })
  const rows = db.prepare(`
    SELECT DISTINCT
      u.id, u.first_name, u.last_name, u.email,
      (SELECT COUNT(*) FROM direct_messages dm2
       WHERE dm2.sender_id = u.id AND dm2.receiver_id = ? AND dm2.is_read = 0) as unread,
      (SELECT dm3.message FROM direct_messages dm3
       WHERE (dm3.sender_id = u.id AND dm3.receiver_id = ?)
          OR (dm3.sender_id = ? AND dm3.receiver_id = u.id)
       ORDER BY dm3.created_at DESC LIMIT 1) as last_message,
      (SELECT dm3.created_at FROM direct_messages dm3
       WHERE (dm3.sender_id = u.id AND dm3.receiver_id = ?)
          OR (dm3.sender_id = ? AND dm3.receiver_id = u.id)
       ORDER BY dm3.created_at DESC LIMIT 1) as last_time
    FROM direct_messages dm
    LEFT JOIN users u ON dm.sender_id = u.id
    WHERE dm.receiver_id = ? OR dm.sender_id = ?
      AND u.id != ?
    ORDER BY last_time DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id)
  res.json(rows)
})

// GET /api/messages/admin/id — get the superuser id
app.get('/api/messages/admin/id', authenticate, (req, res) => {
  const admin = db.prepare('SELECT id, first_name, last_name FROM users WHERE is_superuser = 1 LIMIT 1').get()
  res.json(admin)
})

app.use(errorHandler)

httpServer.listen(PORT, () => {
  console.log(`\n🚀 CoreHR API running on http://localhost:${PORT}\n`)
})

export default app
