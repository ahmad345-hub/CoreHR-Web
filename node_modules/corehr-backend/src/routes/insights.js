import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'
import { getDefaultPermissions } from './permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', (req, res) => {
  const permRecord = db.prepare('SELECT permissions FROM user_permissions WHERE user_id = ?').get(req.user.id)
  const role = req.user.is_superuser ? 'admin' : req.user.is_staff ? 'manager' : 'employee'
  const perms = permRecord ? JSON.parse(permRecord.permissions) : getDefaultPermissions(role)
  const can = (key) => req.user.is_superuser || perms[key] === true

  const emp = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(req.user.id)
  const insights = []
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  // ─── Attendance Insights (attendance.manage = admin/manager view, attendance.view = personal) ───
  if (can('attendance.manage')) {
    const totalEmp = db.prepare('SELECT COUNT(*) as c FROM employees WHERE is_active = 1').get().c
    const presentToday = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'present'").get(today).c
    const attendanceRate = totalEmp > 0 ? Math.round((presentToday / totalEmp) * 100) : 0

    if (attendanceRate < 70) {
      insights.push({ type: 'warning', icon: 'alert-circle', category: 'attendance',
        title_en: 'Low Attendance Today', title_ar: 'حضور منخفض اليوم',
        desc_en: `Only ${attendanceRate}% attendance rate today (${presentToday}/${totalEmp} employees).`,
        desc_ar: `نسبة الحضور اليوم ${attendanceRate}% فقط (${presentToday}/${totalEmp} موظف).`,
      })
    } else if (attendanceRate >= 90) {
      insights.push({ type: 'success', icon: 'checkmark-circle', category: 'attendance',
        title_en: 'Excellent Attendance', title_ar: 'حضور ممتاز',
        desc_en: `${attendanceRate}% attendance rate today. Your team is performing great!`,
        desc_ar: `نسبة الحضور اليوم ${attendanceRate}%. فريقك يعمل بشكل رائع!`,
      })
    }

    // Consecutive absent
    const absentees = db.prepare(`
      SELECT e.id, u.first_name || ' ' || u.last_name as name
      FROM employees e LEFT JOIN users u ON e.user_id = u.id
      WHERE e.is_active = 1 AND e.id NOT IN (
        SELECT DISTINCT employee_id FROM attendance WHERE date >= ?
      )
    `).all(new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
    if (absentees.length > 0) {
      const names = absentees.slice(0, 3).map(a => a.name).join(', ')
      insights.push({ type: 'danger', icon: 'person-remove', category: 'attendance',
        title_en: `${absentees.length} Absent 3+ Days`, title_ar: `${absentees.length} غائب 3+ أيام`,
        desc_en: `${names}${absentees.length > 3 ? ` and ${absentees.length - 3} more` : ''} haven't clocked in recently.`,
        desc_ar: `${names}${absentees.length > 3 ? ` و${absentees.length - 3} آخرين` : ''} لم يسجلوا حضورهم مؤخراً.`,
      })
    }
  } else if (can('attendance.view') && emp) {
    // Personal attendance insight
    const myToday = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ?").get(emp.id, today)
    if (!myToday) {
      insights.push({ type: 'warning', icon: 'time', category: 'attendance',
        title_en: 'Not Clocked In Yet', title_ar: 'لم تسجل حضورك بعد',
        desc_en: 'You haven\'t clocked in today. Don\'t forget to check in!',
        desc_ar: 'لم تسجل حضورك اليوم. لا تنسى تسجيل الدخول!',
      })
    } else if (!myToday.check_out) {
      insights.push({ type: 'info', icon: 'time', category: 'attendance',
        title_en: `Clocked In at ${myToday.check_in}`, title_ar: `سجلت حضورك الساعة ${myToday.check_in}`,
        desc_en: 'You\'re currently clocked in. Don\'t forget to clock out when you leave.',
        desc_ar: 'أنت مسجل حضور حالياً. لا تنسى تسجيل الخروج.',
      })
    }
  }

  // ─── Leave Insights ──────────────────────────────────────
  if (can('leave.approve')) {
    const pendingLeaves = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status = 'pending'").get().c
    if (pendingLeaves > 0) {
      insights.push({ type: 'info', icon: 'calendar', category: 'leave',
        title_en: `${pendingLeaves} Pending Leave Request${pendingLeaves > 1 ? 's' : ''}`, title_ar: `${pendingLeaves} طلب إجازة معلق`,
        desc_en: `${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} waiting for your approval.`,
        desc_ar: `${pendingLeaves} طلب إجازة بانتظار موافقتك.`,
      })
    }
  } else if (can('leave.view') && emp) {
    const myPending = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE employee_id = ? AND status = 'pending'").get(emp.id).c
    if (myPending > 0) {
      insights.push({ type: 'info', icon: 'calendar', category: 'leave',
        title_en: `${myPending} Leave Request${myPending > 1 ? 's' : ''} Pending`, title_ar: `${myPending} طلب إجازة قيد الانتظار`,
        desc_en: `You have ${myPending} leave request${myPending > 1 ? 's' : ''} awaiting approval.`,
        desc_ar: `لديك ${myPending} طلب إجازة بانتظار الموافقة.`,
      })
    }
  }

  // ─── Payroll Insights (admin only) ───────────────────────
  if (can('payroll.manage')) {
    const expiringContracts = db.prepare(`
      SELECT COUNT(*) as c FROM contracts
      WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= date('now', '+30 days') AND end_date >= date('now')
    `).get().c
    if (expiringContracts > 0) {
      insights.push({ type: 'warning', icon: 'document-text', category: 'payroll',
        title_en: `${expiringContracts} Contract${expiringContracts > 1 ? 's' : ''} Expiring Soon`, title_ar: `${expiringContracts} عقد ينتهي قريباً`,
        desc_en: `${expiringContracts} contract${expiringContracts > 1 ? 's' : ''} will expire within 30 days.`,
        desc_ar: `${expiringContracts} عقد سينتهي خلال 30 يوم.`,
      })
    }

    const draftPayslips = db.prepare("SELECT COUNT(*) as c FROM payslips WHERE status = 'draft'").get().c
    if (draftPayslips > 0) {
      insights.push({ type: 'info', icon: 'cash', category: 'payroll',
        title_en: `${draftPayslips} Draft Payslip${draftPayslips > 1 ? 's' : ''}`, title_ar: `${draftPayslips} كشف راتب مسودة`,
        desc_en: `${draftPayslips} payslip${draftPayslips > 1 ? 's' : ''} still in draft. Confirm and process them.`,
        desc_ar: `${draftPayslips} كشف راتب بحاجة للتأكيد.`,
      })
    }
  }

  // ─── Helpdesk Insights ───────────────────────────────────
  if (can('helpdesk.manage')) {
    const urgentTickets = db.prepare("SELECT COUNT(*) as c FROM helpdesk_tickets WHERE status IN ('open','in_progress') AND priority = 'urgent'").get().c
    const openTickets = db.prepare("SELECT COUNT(*) as c FROM helpdesk_tickets WHERE status = 'open'").get().c
    if (urgentTickets > 0) {
      insights.push({ type: 'danger', icon: 'flame', category: 'helpdesk',
        title_en: `${urgentTickets} Urgent Ticket${urgentTickets > 1 ? 's' : ''}`, title_ar: `${urgentTickets} تذكرة عاجلة`,
        desc_en: `${urgentTickets} urgent ticket${urgentTickets > 1 ? 's' : ''} requiring immediate attention.`,
        desc_ar: `${urgentTickets} تذكرة عاجلة تحتاج اهتمام فوري.`,
      })
    } else if (openTickets > 5) {
      insights.push({ type: 'warning', icon: 'headset', category: 'helpdesk',
        title_en: `${openTickets} Open Tickets`, title_ar: `${openTickets} تذكرة مفتوحة`,
        desc_en: `${openTickets} tickets are open. Prioritize resolving them.`,
        desc_ar: `${openTickets} تذكرة مفتوحة. رتب أولوياتها.`,
      })
    }
  } else if (can('helpdesk.view') && emp) {
    const myOpen = db.prepare("SELECT COUNT(*) as c FROM helpdesk_tickets WHERE employee_id = ? AND status IN ('open','in_progress')").get(emp.id).c
    if (myOpen > 0) {
      insights.push({ type: 'info', icon: 'headset', category: 'helpdesk',
        title_en: `${myOpen} Open Ticket${myOpen > 1 ? 's' : ''}`, title_ar: `${myOpen} تذكرة مفتوحة`,
        desc_en: `You have ${myOpen} open support ticket${myOpen > 1 ? 's' : ''}.`,
        desc_ar: `لديك ${myOpen} تذكرة دعم مفتوحة.`,
      })
    }
  }

  // ─── Performance Insights ────────────────────────────────
  if (can('performance.manage')) {
    const lowGoals = db.prepare("SELECT COUNT(*) as c FROM performance_goals WHERE status = 'active' AND progress < 30").get().c
    if (lowGoals > 0) {
      insights.push({ type: 'warning', icon: 'trending-up', category: 'performance',
        title_en: `${lowGoals} Goal${lowGoals > 1 ? 's' : ''} Behind Schedule`, title_ar: `${lowGoals} هدف متأخر`,
        desc_en: `${lowGoals} goal${lowGoals > 1 ? 's have' : ' has'} less than 30% progress.`,
        desc_ar: `${lowGoals} هدف بتقدم أقل من 30%.`,
      })
    }
  } else if (can('performance.view') && emp) {
    const myGoals = db.prepare("SELECT COUNT(*) as c FROM performance_goals WHERE employee_id = ? AND status = 'active'").get(emp.id).c
    const myLow = db.prepare("SELECT COUNT(*) as c FROM performance_goals WHERE employee_id = ? AND status = 'active' AND progress < 30").get(emp.id).c
    if (myLow > 0) {
      insights.push({ type: 'warning', icon: 'trending-up', category: 'performance',
        title_en: `${myLow} of ${myGoals} Goals Need Attention`, title_ar: `${myLow} من ${myGoals} أهداف تحتاج اهتمام`,
        desc_en: `${myLow} of your goals ${myLow > 1 ? 'have' : 'has'} low progress. Keep pushing!`,
        desc_ar: `${myLow} من أهدافك بتقدم منخفض. استمر بالعمل!`,
      })
    }
  }

  // ─── Recruitment Insights (manager+) ─────────────────────
  if (can('recruitment.view')) {
    const openPositions = db.prepare("SELECT COUNT(*) as c FROM job_postings WHERE status = 'open'").get().c
    const totalCandidates = db.prepare("SELECT COUNT(*) as c FROM candidates WHERE status = 'active'").get().c
    if (openPositions > 0) {
      insights.push({ type: 'info', icon: 'briefcase', category: 'recruitment',
        title_en: `${openPositions} Open Position${openPositions > 1 ? 's' : ''}, ${totalCandidates} Candidate${totalCandidates > 1 ? 's' : ''}`,
        title_ar: `${openPositions} وظيفة مفتوحة، ${totalCandidates} مرشح`,
        desc_en: `${totalCandidates} active candidate${totalCandidates > 1 ? 's' : ''} across ${openPositions} position${openPositions > 1 ? 's' : ''}.`,
        desc_ar: `${totalCandidates} مرشح نشط على ${openPositions} وظيفة.`,
      })
    }
  }

  // ─── Workforce Summary (employees.view = manager+) ───────
  if (can('employees.view')) {
    const totalEmp = db.prepare('SELECT COUNT(*) as c FROM employees WHERE is_active = 1').get().c
    const genderStats = db.prepare("SELECT gender, COUNT(*) as c FROM employees WHERE is_active = 1 GROUP BY gender").all()
    const male = genderStats.find(g => g.gender === 'male')?.c || 0
    const female = genderStats.find(g => g.gender === 'female')?.c || 0
    const depts = db.prepare('SELECT COUNT(*) as c FROM departments').get().c
    const diversityPct = totalEmp > 0 ? Math.round((female / totalEmp) * 100) : 0
    insights.push({ type: 'neutral', icon: 'analytics', category: 'workforce',
      title_en: `Workforce: ${totalEmp} Employees`, title_ar: `القوى العاملة: ${totalEmp} موظف`,
      desc_en: `${male} male, ${female} female (${diversityPct}% diversity). Across ${depts} departments.`,
      desc_ar: `${male} ذكور، ${female} إناث (${diversityPct}% تنوع). على ${depts} أقسام.`,
    })
  }

  res.json(insights)
})

export default router
