import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Intent detection keywords
const INTENTS = {
  leave_balance:    { en: ['leave balance','remaining leave','leave left','how many leave','vacation days','days off'], ar: ['رصيد إجازة','إجازات متبقية','كم إجازة','أيام إجازة'] },
  leave_status:     { en: ['leave status','leave request','my leave','leave pending'], ar: ['حالة الإجازة','طلب إجازة','إجازتي'] },
  attendance:       { en: ['attendance','my attendance','clock','check in','present','absent'], ar: ['حضوري','الحضور','تسجيل','غياب'] },
  salary:           { en: ['salary','payslip','pay','wage','net pay','my salary'], ar: ['راتبي','كشف راتب','الراتب','المرتب'] },
  team:             { en: ['team','how many employee','headcount','total employee','staff count'], ar: ['الفريق','عدد الموظفين','كم موظف'] },
  department:       { en: ['department','my department','which department'], ar: ['قسمي','القسم','أي قسم'] },
  ticket:           { en: ['ticket','support','helpdesk','my ticket','open ticket'], ar: ['تذكرة','دعم','مساعدة','تذكرتي'] },
  performance:      { en: ['goal','performance','my goal','progress','target'], ar: ['هدفي','أدائي','تقدمي','أهداف'] },
  policy_leave:     { en: ['leave policy','leave type','annual leave','sick leave','how many days'], ar: ['سياسة الإجازة','نوع إجازة','إجازة سنوية','إجازة مرضية'] },
  policy_shift:     { en: ['shift','working hours','work time','schedule','my shift'], ar: ['دوامي','ساعات العمل','ورديتي','الوردية'] },
  who_am_i:         { en: ['my profile','my info','who am i','my position','my role'], ar: ['ملفي','معلوماتي','من أنا','وظيفتي','منصبي'] },
  birthday:         { en: ['birthday','birthdays this month'], ar: ['عيد ميلاد','أعياد الميلاد'] },
  holiday:          { en: ['holiday','next holiday','upcoming holiday','day off'], ar: ['عطلة','إجازة رسمية','العطل'] },
  greeting:         { en: ['hello','hi','hey','good morning','good afternoon','help','what can you do'], ar: ['مرحبا','أهلا','هلا','صباح الخير','مساء الخير','ساعدني','شو بتقدر تساعدني'] },
}

function detectIntent(message) {
  const msg = message.toLowerCase().trim()
  let bestMatch = null
  let bestScore = 0

  for (const [intent, keywords] of Object.entries(INTENTS)) {
    for (const kw of [...keywords.en, ...keywords.ar]) {
      if (msg.includes(kw)) {
        const score = kw.length
        if (score > bestScore) { bestScore = score; bestMatch = intent }
      }
    }
  }
  return bestMatch
}

function getEmployeeData(userId) {
  return db.prepare(`
    SELECT e.*, u.first_name, u.last_name, u.email, u.username,
      d.name as department_name, jp.title as job_title,
      s.name as shift_name, s.start_time, s.end_time,
      wt.name as work_type_name
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN job_positions jp ON e.job_position_id = jp.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    LEFT JOIN work_types wt ON e.work_type_id = wt.id
    WHERE e.user_id = ?
  `).get(userId)
}

router.post('/', (req, res) => {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'Message required' })

  const intent = detectIntent(message)
  const emp = getEmployeeData(req.user.id)
  const isArabic = /[\u0600-\u06FF]/.test(message)

  let reply = ''

  switch (intent) {
    case 'greeting': {
      const name = req.user.first_name || 'there'
      reply = isArabic
        ? `أهلاً ${name}! 👋 أنا مساعدك الذكي في CoreHR. أقدر أساعدك بـ:\n• رصيد الإجازات\n• معلومات الراتب\n• سجل الحضور\n• تذاكر الدعم\n• الأهداف والأداء\n• سياسات الشركة\n\nاسألني أي سؤال!`
        : `Hello ${name}! 👋 I'm your CoreHR AI Assistant. I can help you with:\n• Leave balance & requests\n• Salary & payslip info\n• Attendance records\n• Support tickets\n• Goals & performance\n• Company policies\n\nJust ask me anything!`
      break
    }

    case 'leave_balance': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف مرتبط بحسابك.' : 'No employee record found for your account.'; break }
      const allocs = db.prepare(`
        SELECT la.*, lt.name as type_name FROM leave_allocations la
        LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE la.employee_id = ?
      `).all(emp.id)
      if (allocs.length === 0) { reply = isArabic ? 'لا يوجد رصيد إجازات مخصص لك حالياً.' : 'You don\'t have any leave allocations yet.'; break }
      reply = isArabic ? '📋 رصيد إجازاتك:\n' : '📋 Your leave balance:\n'
      allocs.forEach(a => {
        const remaining = a.total_days - a.used_days
        reply += `\n• ${a.type_name}: ${remaining}/${a.total_days} ${isArabic ? 'يوم متبقي' : 'days remaining'} (${a.used_days} ${isArabic ? 'مستخدم' : 'used'})`
      })
      break
    }

    case 'leave_status': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      const requests = db.prepare(`
        SELECT lr.*, lt.name as type_name FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = ? ORDER BY lr.created_at DESC LIMIT 5
      `).all(emp.id)
      if (requests.length === 0) { reply = isArabic ? 'لا يوجد طلبات إجازة.' : 'You have no leave requests.'; break }
      reply = isArabic ? '📝 آخر طلبات إجازاتك:\n' : '📝 Your recent leave requests:\n'
      const statusEmoji = { approved: '✅', pending: '⏳', rejected: '❌', cancelled: '🚫' }
      requests.forEach(r => {
        reply += `\n${statusEmoji[r.status] || '•'} ${r.type_name}: ${r.start_date} → ${r.end_date} (${r.days} ${isArabic ? 'يوم' : 'days'}) - ${r.status}`
      })
      break
    }

    case 'attendance': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      const thisMonth = db.prepare(`
        SELECT COUNT(*) as days, ROUND(AVG(worked_hours),1) as avg_hrs, SUM(worked_hours) as total_hrs
        FROM attendance WHERE employee_id = ? AND date >= date('now','start of month')
      `).get(emp.id)
      const today = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = date('now')").get(emp.id)
      reply = isArabic ? '📊 سجل حضورك:\n' : '📊 Your attendance:\n'
      if (today) {
        reply += isArabic
          ? `\n✅ اليوم: ${today.check_in ? 'حضور ' + today.check_in : 'لم تسجل'} ${today.check_out ? '→ ' + today.check_out : '(لم تخرج بعد)'}`
          : `\n✅ Today: ${today.check_in ? 'Checked in at ' + today.check_in : 'Not clocked in'} ${today.check_out ? '→ out at ' + today.check_out : '(still working)'}`
      } else {
        reply += isArabic ? '\n⚠️ لم تسجل حضور اليوم.' : '\n⚠️ You haven\'t clocked in today.'
      }
      reply += isArabic
        ? `\n📅 هذا الشهر: ${thisMonth.days} يوم حضور، معدل ${thisMonth.avg_hrs || 0} ساعة/يوم، إجمالي ${thisMonth.total_hrs || 0} ساعة`
        : `\n📅 This month: ${thisMonth.days} days present, avg ${thisMonth.avg_hrs || 0}h/day, total ${thisMonth.total_hrs || 0}h`
      break
    }

    case 'salary': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      const latest = db.prepare(`
        SELECT * FROM payslips WHERE employee_id = ? ORDER BY period_start DESC LIMIT 1
      `).get(emp.id)
      if (!latest) { reply = isArabic ? 'لا يوجد كشوف رواتب.' : 'No payslips found.'; break }
      reply = isArabic
        ? `💰 آخر كشف راتب (${latest.period_start}):\n\n• الراتب الأساسي: $${Number(latest.basic_pay).toLocaleString()}\n• البدلات: +$${Number(latest.allowances).toLocaleString()}\n• الخصومات: -$${Number(latest.deductions).toLocaleString()}\n• الصافي: $${Number(latest.net_pay).toLocaleString()}\n• الحالة: ${latest.status}`
        : `💰 Latest payslip (${latest.period_start}):\n\n• Basic Pay: $${Number(latest.basic_pay).toLocaleString()}\n• Allowances: +$${Number(latest.allowances).toLocaleString()}\n• Deductions: -$${Number(latest.deductions).toLocaleString()}\n• Net Pay: $${Number(latest.net_pay).toLocaleString()}\n• Status: ${latest.status}`
      break
    }

    case 'team': {
      const total = db.prepare('SELECT COUNT(*) as c FROM employees WHERE is_active = 1').get().c
      const byDept = db.prepare(`
        SELECT d.name, COUNT(e.id) as c FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = 1
        GROUP BY d.id HAVING c > 0 ORDER BY c DESC
      `).all()
      reply = isArabic
        ? `👥 إجمالي الموظفين: ${total}\n\nتوزيع الأقسام:\n`
        : `👥 Total employees: ${total}\n\nBy department:\n`
      byDept.forEach(d => { reply += `• ${d.name}: ${d.c}\n` })
      break
    }

    case 'department': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      const deptMembers = db.prepare(`
        SELECT u.first_name || ' ' || u.last_name as name, jp.title
        FROM employees e
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN job_positions jp ON e.job_position_id = jp.id
        WHERE e.department_id = ? AND e.is_active = 1
      `).all(emp.department_id)
      reply = isArabic
        ? `🏢 قسمك: ${emp.department_name || 'غير محدد'}\nعدد الأعضاء: ${deptMembers.length}\n\n`
        : `🏢 Your department: ${emp.department_name || 'Not assigned'}\nTeam size: ${deptMembers.length}\n\n`
      deptMembers.forEach(m => { reply += `• ${m.name} - ${m.title || 'N/A'}\n` })
      break
    }

    case 'ticket': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      const tickets = db.prepare(`
        SELECT t.*, c.name as category_name FROM helpdesk_tickets t
        LEFT JOIN helpdesk_categories c ON t.category_id = c.id
        WHERE t.employee_id = ? ORDER BY t.created_at DESC LIMIT 5
      `).all(emp.id)
      if (tickets.length === 0) { reply = isArabic ? '🎫 لا يوجد تذاكر دعم.' : '🎫 You have no support tickets.'; break }
      const emoji = { open: '🟡', in_progress: '🔵', resolved: '🟢', closed: '⚫' }
      reply = isArabic ? '🎫 تذاكرك:\n' : '🎫 Your tickets:\n'
      tickets.forEach(t => { reply += `\n${emoji[t.status] || '•'} ${t.title} [${t.priority}] - ${t.status}` })
      break
    }

    case 'performance': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      const goals = db.prepare("SELECT * FROM performance_goals WHERE employee_id = ? AND status = 'active'").all(emp.id)
      if (goals.length === 0) { reply = isArabic ? '🎯 لا يوجد أهداف نشطة.' : '🎯 You have no active goals.'; break }
      reply = isArabic ? '🎯 أهدافك النشطة:\n' : '🎯 Your active goals:\n'
      goals.forEach(g => {
        const bar = '█'.repeat(Math.floor(g.progress / 10)) + '░'.repeat(10 - Math.floor(g.progress / 10))
        reply += `\n• ${g.title}\n  ${bar} ${g.progress}%`
        if (g.target_date) reply += ` (${isArabic ? 'الموعد' : 'due'}: ${g.target_date})`
      })
      break
    }

    case 'policy_leave': {
      const types = db.prepare('SELECT * FROM leave_types ORDER BY name').all()
      reply = isArabic ? '📜 سياسة الإجازات:\n' : '📜 Leave Policy:\n'
      types.forEach(t => {
        reply += `\n• ${t.name}: ${t.total_days} ${isArabic ? 'يوم' : 'days'} ${t.paid ? (isArabic ? '(مدفوعة)' : '(paid)') : (isArabic ? '(غير مدفوعة)' : '(unpaid)')} ${t.carryforward ? (isArabic ? '- قابلة للترحيل' : '- carryforward') : ''}`
      })
      break
    }

    case 'policy_shift': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      reply = isArabic
        ? `⏰ معلومات دوامك:\n\n• الوردية: ${emp.shift_name || 'غير محدد'}\n• من: ${emp.start_time || '—'}\n• إلى: ${emp.end_time || '—'}\n• نوع العمل: ${emp.work_type_name || 'غير محدد'}`
        : `⏰ Your schedule:\n\n• Shift: ${emp.shift_name || 'Not assigned'}\n• From: ${emp.start_time || '—'}\n• To: ${emp.end_time || '—'}\n• Work type: ${emp.work_type_name || 'Not assigned'}`
      break
    }

    case 'who_am_i': {
      if (!emp) { reply = isArabic ? 'لا يوجد سجل موظف.' : 'No employee record found.'; break }
      reply = isArabic
        ? `👤 معلوماتك:\n\n• الاسم: ${emp.first_name} ${emp.last_name}\n• البريد: ${emp.email}\n• الرقم الوظيفي: ${emp.badge_id || '—'}\n• المنصب: ${emp.job_title || 'غير محدد'}\n• القسم: ${emp.department_name || 'غير محدد'}\n• تاريخ الانضمام: ${emp.date_joining || '—'}\n• الراتب: $${Number(emp.salary || 0).toLocaleString()}`
        : `👤 Your profile:\n\n• Name: ${emp.first_name} ${emp.last_name}\n• Email: ${emp.email}\n• Badge: ${emp.badge_id || '—'}\n• Position: ${emp.job_title || 'Not assigned'}\n• Department: ${emp.department_name || 'Not assigned'}\n• Joined: ${emp.date_joining || '—'}\n• Salary: $${Number(emp.salary || 0).toLocaleString()}`
      break
    }

    case 'holiday': {
      const holidays = db.prepare("SELECT * FROM holidays WHERE date >= date('now') ORDER BY date LIMIT 5").all()
      if (holidays.length === 0) { reply = isArabic ? '🎉 لا يوجد عطل قادمة.' : '🎉 No upcoming holidays.'; break }
      reply = isArabic ? '🎉 العطل القادمة:\n' : '🎉 Upcoming holidays:\n'
      holidays.forEach(h => { reply += `\n• ${h.name} - ${h.date}` })
      break
    }

    case 'birthday': {
      const bdays = db.prepare(`
        SELECT u.first_name || ' ' || u.last_name as name, e.dob
        FROM employees e LEFT JOIN users u ON e.user_id = u.id
        WHERE e.dob IS NOT NULL AND strftime('%m', e.dob) = strftime('%m', 'now')
      `).all()
      if (bdays.length === 0) { reply = isArabic ? '🎂 لا يوجد أعياد ميلاد هذا الشهر.' : '🎂 No birthdays this month.'; break }
      reply = isArabic ? '🎂 أعياد الميلاد هذا الشهر:\n' : '🎂 Birthdays this month:\n'
      bdays.forEach(b => { reply += `\n• ${b.name} (${b.dob?.slice(5)})` })
      break
    }

    default: {
      reply = isArabic
        ? `عذراً، لم أفهم سؤالك. 🤔\n\nجرب تسألني عن:\n• "كم إجازة باقيلي؟"\n• "راتبي"\n• "حضوري اليوم"\n• "تذاكر الدعم"\n• "أهدافي"\n• "سياسة الإجازات"\n• "العطل القادمة"\n• "معلوماتي"`
        : `Sorry, I didn't understand that. 🤔\n\nTry asking me about:\n• "What's my leave balance?"\n• "Show my salary"\n• "My attendance today"\n• "My support tickets"\n• "My goals"\n• "Leave policy"\n• "Upcoming holidays"\n• "My profile info"`
    }
  }

  res.json({ reply, intent: intent || 'unknown' })
})

export default router
