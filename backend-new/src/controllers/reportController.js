const { Op } = require('sequelize');
const { sequelize, Attendance, Employee, LeaveRequest, LeaveType, Payslip, Department, Candidate, Recruitment } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.headcountReport = async (req, res) => {
  try {
    // RBAC: manager sees only own department
    const deptWhere = {};
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        deptWhere.id = emp.department_id;
      }
    }

    const departments = await Department.findAll({
      where: deptWhere,
      include: [{ model: Employee, as: 'employees', attributes: ['id', 'is_active', 'gender'] }],
      order: [['name', 'ASC']],
    });
    const data = departments.map(d => ({
      department: d.name,
      total: d.employees ? d.employees.length : 0,
      active: d.employees ? d.employees.filter(e => e.is_active).length : 0,
      male: d.employees ? d.employees.filter(e => e.gender === 'male').length : 0,
      female: d.employees ? d.employees.filter(e => e.gender === 'female').length : 0,
    }));
    return res.json(data);
  } catch (err) {
    console.error('Headcount report error:', err);
    return res.json([]);
  }
};

exports.attendanceReport = async (req, res) => {
  try {
    const { month, year, start_date, end_date, department_id } = req.query;
    let dateFrom, dateTo;
    if (month && year) {
      const m = parseInt(month), y = parseInt(year);
      dateFrom = `${y}-${String(m).padLeft ? m : String(m).padStart(2,'0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      dateTo = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    } else if (start_date && end_date) {
      dateFrom = start_date; dateTo = end_date;
    } else {
      const now = new Date();
      dateFrom = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
      dateTo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    }

    const empWhere = { is_active: true };
    if (department_id) empWhere.department_id = department_id;

    // RBAC: manager sees only own department
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        empWhere.department_id = emp.department_id;
      }
    }

    const employees = await Employee.findAll({
      where: empWhere,
      attributes: ['id', 'first_name', 'last_name'],
      include: [{ model: Department, as: 'department', attributes: ['name'] }],
    });

    const data = [];
    for (const emp of employees) {
      const records = await Attendance.findAll({
        where: { employee_id: emp.id, date: { [Op.between]: [dateFrom, dateTo] } },
      });
      const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
      const totalHours = records.reduce((s, r) => s + (parseFloat(r.worked_hours) || 0), 0);
      const avgHours = presentDays > 0 ? parseFloat((totalHours / presentDays).toFixed(1)) : 0;
      data.push({
        employee: `${emp.first_name} ${emp.last_name}`,
        department: emp.department?.name || '',
        daysPresent: presentDays,
        avgHours,
        totalHours: parseFloat(totalHours.toFixed(1)),
      });
    }
    return res.json(data);
  } catch (err) {
    console.error('Attendance report error:', err);
    return res.json([]);
  }
};

exports.leaveReport = async (req, res) => {
  try {
    const leaveEmpWhere = { is_active: true };
    // RBAC: manager sees only own department
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        leaveEmpWhere.department_id = emp.department_id;
      }
    }

    const employees = await Employee.findAll({
      where: leaveEmpWhere,
      attributes: ['id', 'first_name', 'last_name'],
      include: [{ model: Department, as: 'department', attributes: ['name'] }],
    });

    const leaveTypes = await LeaveType.findAll();
    const data = [];

    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const requests = await LeaveRequest.findAll({
          where: { employee_id: emp.id, leave_type_id: lt.id },
        });
        if (requests.length > 0) {
          data.push({
            employee: `${emp.first_name} ${emp.last_name}`,
            department: emp.department?.name || '',
            leave_type: lt.name,
            requests: requests.length,
            approved_days: requests.filter(r => r.status === 'approved').reduce((s, r) => s + (parseFloat(r.days) || 0), 0),
            rejected: requests.filter(r => r.status === 'rejected').length,
          });
        }
      }
    }
    return res.json(data);
  } catch (err) {
    console.error('Leave report error:', err);
    return res.json([]);
  }
};

exports.payrollReport = async (req, res) => {
  try {
    const payrollEmpWhere = { is_active: true };
    // RBAC: manager sees only own department
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        payrollEmpWhere.department_id = emp.department_id;
      }
    }

    const employees = await Employee.findAll({
      where: payrollEmpWhere,
      attributes: ['id', 'first_name', 'last_name'],
      include: [{ model: Department, as: 'department', attributes: ['name'] }],
    });

    const data = [];
    for (const emp of employees) {
      const payslips = await Payslip.findAll({ where: { employee_id: emp.id } });
      if (payslips.length > 0) {
        data.push({
          employee: `${emp.first_name} ${emp.last_name}`,
          department: emp.department?.name || '',
          payslip_count: payslips.length,
          total_basic: payslips.reduce((s, p) => s + parseFloat(p.basic_salary || 0), 0),
          total_allowances: payslips.reduce((s, p) => s + parseFloat(p.total_allowances || 0), 0),
          total_deductions: payslips.reduce((s, p) => s + parseFloat(p.total_deductions || 0), 0),
          total_net: payslips.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0),
        });
      }
    }
    return res.json(data);
  } catch (err) {
    console.error('Payroll report error:', err);
    return res.json([]);
  }
};

exports.recruitmentReport = async (req, res) => {
  try {
    const recruitments = await Recruitment.findAll({
      include: [
        { model: Department, as: 'department', attributes: ['name'] },
        { model: Candidate, as: 'candidates' },
      ],
    });
    const data = recruitments.map(r => ({
      title: r.title,
      department: r.department?.name || 'N/A',
      status: r.status,
      vacancies: r.vacancies,
      candidates: r.candidates ? r.candidates.length : 0,
      hired: r.candidates ? r.candidates.filter(c => c.status === 'hired').length : 0,
    }));
    return res.json(data);
  } catch (err) {
    console.error('Recruitment report error:', err);
    return res.json([]);
  }
};
