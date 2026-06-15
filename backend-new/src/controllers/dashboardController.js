const { Op, fn, literal, col } = require('sequelize');
const { Employee, Attendance, LeaveRequest, Department, Announcement, Holiday, Recruitment, Candidate, Payslip, HelpdeskTicket, Project, Contract, sequelize } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`;

    // RBAC: build employee filter based on role
    const empFilter = { is_active: true };
    let employeeIds = null;

    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        empFilter.department_id = emp.department_id;
        const deptEmps = await Employee.findAll({ where: empFilter, attributes: ['id'] });
        employeeIds = deptEmps.map(e => e.id);
      } else {
        employeeIds = [];
      }
    } else if (req.user.role === 'employee') {
      employeeIds = req.user.employee_id ? [req.user.employee_id] : [];
    }

    // Build attendance/leave filters
    const attendanceFilter = { date: today, status: { [Op.in]: ['present', 'late'] } };
    const absentFilter = { date: today, status: 'absent' };
    const leaveFilter = { status: 'approved', start_date: { [Op.lte]: today }, end_date: { [Op.gte]: today } };
    const pendingLeaveFilter = { status: 'pending' };

    if (employeeIds !== null) {
      attendanceFilter.employee_id = { [Op.in]: employeeIds };
      absentFilter.employee_id = { [Op.in]: employeeIds };
      leaveFilter.employee_id = { [Op.in]: employeeIds };
      pendingLeaveFilter.employee_id = { [Op.in]: employeeIds };
    }

    const [
      totalEmployees, presentToday, onLeaveToday, pendingLeaves,
      absentToday, openPositions, totalCandidates, draftPayslips,
      openTickets, activeProjects, expiringContracts, newThisMonth,
    ] = await Promise.all([
      Employee.count({ where: empFilter }),
      Attendance.count({ where: attendanceFilter }),
      LeaveRequest.count({ where: leaveFilter }),
      LeaveRequest.count({ where: pendingLeaveFilter }),
      Attendance.count({ where: absentFilter }),
      Recruitment.count({ where: { status: 'open' } }),
      Candidate.count(),
      Payslip.count({ where: { status: 'draft' } }),
      HelpdeskTicket.count({ where: { status: { [Op.in]: ['open', 'in_progress'] } } }),
      Project.count({ where: { status: 'active' } }),
      Contract.count({ where: { status: 'active', end_date: { [Op.lte]: new Date(now.getTime() + 30*24*60*60*1000) } } }),
      Employee.count({ where: { ...empFilter, date_of_joining: { [Op.gte]: monthStart } } }),
    ]);

    // Total payroll this month
    const payslipWhere = { month: currentMonth, year: currentYear };
    if (employeeIds !== null) payslipWhere.employee_id = { [Op.in]: employeeIds };
    const payslips = await Payslip.findAll({ where: payslipWhere });
    const totalPayroll = payslips.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);

    return res.json({
      total_employees: totalEmployees,
      present_today: presentToday,
      on_leave_today: onLeaveToday,
      pending_leaves: pendingLeaves,
      pending_leave_requests: pendingLeaves,
      absent_today: absentToday,
      open_positions: openPositions,
      total_candidates: totalCandidates,
      draft_payslips: draftPayslips,
      total_payroll_this_month: totalPayroll,
      open_tickets: openTickets,
      active_projects: activeProjects,
      expiring_contracts: expiringContracts,
      new_this_month: newThisMonth,
      total_departments: await Department.count(),
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const announcements = await Announcement.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { expire_date: null },
          { expire_date: { [Op.gte]: today } },
        ],
      },
      order: [['created_at', 'DESC']],
      limit: 10,
    });
    return res.json(announcements);
  } catch (err) {
    console.error('Announcements error:', err);
    return res.json([]);
  }
};

exports.getBirthdays = async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const employees = await Employee.findAll({
      where: {
        is_active: true,
        date_of_birth: { [Op.ne]: null },
      },
      attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'profile_image'],
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    });

    // Filter by month in JS to avoid PostgreSQL EXTRACT issues
    const filtered = employees.filter(e => {
      if (!e.date_of_birth) return false;
      const month = new Date(e.date_of_birth).getMonth() + 1;
      return month === currentMonth;
    });

    return res.json(filtered);
  } catch (err) {
    console.error('Birthdays error:', err);
    return res.json([]);
  }
};

exports.getHolidays = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const holidays = await Holiday.findAll({
      where: { date: { [Op.gte]: today } },
      order: [['date', 'ASC']],
      limit: 10,
    });
    return res.json(holidays);
  } catch (err) {
    console.error('Holidays error:', err);
    return res.json([]);
  }
};

exports.getAttendanceTrend = async (req, res) => {
  try {
    // Last 7 days attendance trend
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const present = await Attendance.count({ where: { date: dateStr, status: { [Op.in]: ['present', 'late'] } } });
      const absent = await Attendance.count({ where: { date: dateStr, status: 'absent' } });
      const late = await Attendance.count({ where: { date: dateStr, status: 'late' } });
      days.push({ date: dateStr, present, absent, late });
    }
    return res.json(days);
  } catch (err) {
    console.error('Attendance trend error:', err);
    return res.json([]);
  }
};

exports.getDepartmentDistribution = async (req, res) => {
  try {
    const departments = await Department.findAll({
      attributes: ['id', 'name'],
    });

    const result = [];
    for (const dept of departments) {
      const count = await Employee.count({ where: { department_id: dept.id, is_active: true } });
      result.push({ name: dept.name, count });
    }
    return res.json(result);
  } catch (err) {
    console.error('Dept distribution error:', err);
    return res.json([]);
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    // Recent leave requests and attendance
    const recentLeaves = await LeaveRequest.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [{ model: Employee, as: 'employee', attributes: ['first_name', 'last_name'] }],
    });

    const activities = recentLeaves.map(l => ({
      type: 'leave',
      message: `${l.employee?.first_name} ${l.employee?.last_name} - Leave request (${l.status})`,
      date: l.created_at,
      status: l.status,
    }));

    return res.json(activities);
  } catch (err) {
    console.error('Recent activity error:', err);
    return res.json([]);
  }
};
