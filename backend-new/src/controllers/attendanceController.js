const { Op } = require('sequelize');
const { Attendance, Employee } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.clockIn = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee linked to this user.' });
    }

    const today = new Date().toISOString().split('T')[0];

    const existing = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already clocked in today.' });
    }

    const now = new Date();
    const checkInTime = now.toTimeString().split(' ')[0];

    // Determine status based on time (consider 9:00 AM as start)
    const hour = now.getHours();
    const minutes = now.getMinutes();
    let status = 'present';
    if (hour > 9 || (hour === 9 && minutes > 0)) {
      status = 'late';
    }

    const attendance = await Attendance.create({
      employee_id: employeeId,
      date: today,
      check_in: checkInTime,
      status,
    });

    return res.status(201).json({ data: attendance, message: 'Clocked in successfully.' });
  } catch (err) {
    console.error('Clock in error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee linked to this user.' });
    }

    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (!attendance) {
      return res.status(400).json({ error: 'No clock-in record found for today.' });
    }

    if (attendance.check_out) {
      return res.status(400).json({ error: 'Already clocked out today.' });
    }

    const now = new Date();
    const checkOutTime = now.toTimeString().split(' ')[0];

    // Calculate worked hours
    const checkInParts = attendance.check_in.split(':');
    const checkInDate = new Date();
    checkInDate.setHours(parseInt(checkInParts[0]), parseInt(checkInParts[1]), parseInt(checkInParts[2] || 0));

    const diffMs = now - checkInDate;
    const workedHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    await attendance.update({
      check_out: checkOutTime,
      worked_hours: workedHours,
    });

    return res.json({ data: attendance, message: 'Clocked out successfully.' });
  } catch (err) {
    console.error('Clock out error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, date, date_from, date_to, employee_id, month, year, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // RBAC: manager sees own department only
    let departmentFilter = null;
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        departmentFilter = emp.department_id;
      }
    }

    if (date) {
      where.date = date;
    }

    if (date_from && date_to) {
      where.date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
      where.date = { [Op.gte]: date_from };
    } else if (date_to) {
      where.date = { [Op.lte]: date_to };
    }

    if (employee_id) {
      where.employee_id = employee_id;
    }

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      where.date = { [Op.between]: [startDate, endDate] };
    }

    if (status) {
      where.status = status;
    }

    // Build employee include with optional department filter
    const employeeInclude = {
      model: Employee,
      as: 'employee',
      attributes: ['id', 'first_name', 'last_name', 'badge_id', 'profile_image'],
    };
    if (departmentFilter) {
      employeeInclude.where = { department_id: departmentFilter };
      employeeInclude.required = true;
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [employeeInclude],
      limit: parseInt(limit),
      offset,
      order: [['date', 'DESC'], ['check_in', 'DESC']],
    });

    return res.json({
      results: rows,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Attendance list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.stats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { LeaveRequest } = require('../models');

    const totalEmployees = await Employee.count({ where: { is_active: true } });
    const presentToday = await Attendance.count({ where: { date: today, status: { [Op.in]: ['present', 'late'] } } });
    const absentToday = await Attendance.count({ where: { date: today, status: 'absent' } });
    const onLeaveToday = await LeaveRequest.count({
      where: { status: 'approved', start_date: { [Op.lte]: today }, end_date: { [Op.gte]: today } },
    });

    return res.json({
      total: totalEmployees,
      present: presentToday,
      absent: absentToday,
      on_leave: onLeaveToday,
    });
  } catch (err) {
    console.error('Attendance stats error:', err);
    return res.json({ total: 0, present: 0, absent: 0, on_leave: 0 });
  }
};

exports.today = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // RBAC filter
    const where = { date: today };
    const employeeInclude = {
      model: Employee,
      as: 'employee',
      attributes: ['id', 'first_name', 'last_name', 'badge_id', 'profile_image'],
    };

    if (req.user.role === 'employee') {
      // Employee sees only own
      if (req.user.employee_id) where.employee_id = req.user.employee_id;
      else return res.json([]);
    } else if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        employeeInclude.where = { department_id: emp.department_id };
        employeeInclude.required = true;
      }
    }

    const rows = await Attendance.findAll({
      where,
      include: [employeeInclude],
      order: [['check_in', 'DESC']],
    });

    return res.json(rows);
  } catch (err) {
    console.error('Attendance today error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.my = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee linked to this user.' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Attendance.findAndCountAll({
      where: { employee_id: employeeId },
      limit: parseInt(limit),
      offset,
      order: [['date', 'DESC']],
    });

    return res.json({
      results: rows,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('My attendance error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
