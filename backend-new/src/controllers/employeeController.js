const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { Employee, User, Department, JobPosition, Company, Attendance, LeaveRequest, LeaveAllocation, LeaveType } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department_id, department, is_active, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    // RBAC: manager sees own department only (admin sees all, employee blocked at route level)
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        where.department_id = emp.department_id;
      } else {
        return res.json({ results: [], total: 0, page: 1, pages: 1 });
      }
    }

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { badge_id: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const deptFilter = department_id || department;
    if (deptFilter) {
      where.department_id = deptFilter;
    }

    const activeFilter = status !== undefined ? status : is_active;
    if (activeFilter !== undefined) {
      where.is_active = activeFilter === 'true' || activeFilter === 'active';
    }

    const { count, rows } = await Employee.findAndCountAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: JobPosition, as: 'jobPosition', attributes: ['id', 'title'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      return {
        ...json,
        department_name: json.department?.name || null,
        job_title: json.jobPosition?.title || null,
        work_type_name: json.work_type ? json.work_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null,
        date_joining: json.date_of_joining,
        salary: parseFloat(json.basic_salary) || 0,
      };
    });

    return res.json({
      results,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Employee list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: JobPosition, as: 'jobPosition' },
        { model: Company, as: 'company' },
      ],
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // RBAC: employee can only view own profile
    if (req.user.role === 'employee') {
      const emp = await getEmployeeRecord(req);
      if (!emp || emp.id !== employee.id) {
        return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
      }
    }
    // RBAC: manager can only view employees in their department
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (!emp || emp.department_id !== employee.department_id) {
        return res.status(403).json({ error: 'Access denied. Employee is not in your department.' });
      }
    }

    return res.json(employee);
  } catch (err) {
    console.error('Employee get error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    // RBAC: employee can only see own attendance
    if (req.user.role === 'employee') {
      const emp = await getEmployeeRecord(req);
      if (!emp || String(emp.id) !== String(req.params.id)) {
        return res.status(403).json({ error: 'Access denied. You can only view your own attendance.' });
      }
    }
    // RBAC: manager can only see department attendance
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      const target = await Employee.findByPk(req.params.id);
      if (!emp || !target || emp.department_id !== target.department_id) {
        return res.status(403).json({ error: 'Access denied. Employee is not in your department.' });
      }
    }

    const records = await Attendance.findAll({
      where: { employee_id: req.params.id },
      order: [['date', 'DESC']],
      limit: 60,
    });
    return res.json(records);
  } catch (err) {
    console.error('Employee attendance error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getLeave = async (req, res) => {
  try {
    // RBAC: employee can only see own leave
    if (req.user.role === 'employee') {
      const emp = await getEmployeeRecord(req);
      if (!emp || String(emp.id) !== String(req.params.id)) {
        return res.status(403).json({ error: 'Access denied. You can only view your own leave.' });
      }
    }
    // RBAC: manager can only see department leave
    if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      const target = await Employee.findByPk(req.params.id);
      if (!emp || !target || emp.department_id !== target.department_id) {
        return res.status(403).json({ error: 'Access denied. Employee is not in your department.' });
      }
    }

    const [requests, allocations] = await Promise.all([
      LeaveRequest.findAll({
        where: { employee_id: req.params.id },
        include: [{ model: LeaveType, as: 'leaveType', attributes: ['id', 'name'] }],
        order: [['created_at', 'DESC']],
        limit: 30,
      }),
      LeaveAllocation.findAll({
        where: { employee_id: req.params.id },
        include: [{ model: LeaveType, as: 'leaveType', attributes: ['id', 'name'] }],
      }),
    ]);
    return res.json({ requests, allocations });
  } catch (err) {
    console.error('Employee leave error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    // Map frontend field names to model field names
    const data = { ...req.body };
    if (data.dob && !data.date_of_birth) { data.date_of_birth = data.dob; delete data.dob; }
    if (data.date_joining && !data.date_of_joining) { data.date_of_joining = data.date_joining; delete data.date_joining; }
    if (data.salary && !data.basic_salary) { data.basic_salary = data.salary; delete data.salary; }
    if (data.work_type_id && !data.work_type) { data.work_type = data.work_type_id; delete data.work_type_id; }
    if (data.shift_id && !data.shift) { data.shift = data.shift_id; delete data.shift_id; }

    const employee = await Employee.create(data);

    // Auto-create user account
    const username = data.username || `${data.first_name.toLowerCase()}.${data.last_name.toLowerCase()}`;
    const hashedPassword = await bcrypt.hash('changeme123', 10);

    await User.create({
      username,
      password: hashedPassword,
      email: data.email || data.work_email || data.personal_email,
      role: 'employee',
      employee_id: employee.id,
      is_active: true,
    });

    return res.status(201).json({ data: employee, message: 'Employee created successfully.' });
  } catch (err) {
    console.error('Employee create error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Duplicate entry. Employee number or email already exists.' });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // RBAC: employee can only edit own profile
    if (req.user.role === 'employee') {
      const emp = await getEmployeeRecord(req);
      if (!emp || emp.id !== employee.id) {
        return res.status(403).json({ error: 'Access denied. You can only edit your own profile.' });
      }
    }
    // RBAC: manager cannot edit employees
    if (req.user.role === 'manager') {
      return res.status(403).json({ error: 'Access denied. Managers cannot edit employee records.' });
    }

    // Map frontend field names to model field names
    const data = { ...req.body };
    if (data.dob && !data.date_of_birth) { data.date_of_birth = data.dob; delete data.dob; }
    if (data.date_joining && !data.date_of_joining) { data.date_of_joining = data.date_joining; delete data.date_joining; }
    if (data.salary && !data.basic_salary) { data.basic_salary = data.salary; delete data.salary; }
    if (data.work_type_id && !data.work_type) { data.work_type = data.work_type_id; delete data.work_type_id; }
    if (data.shift_id && !data.shift) { data.shift = data.shift_id; delete data.shift_id; }

    await employee.update(data);
    return res.json({ data: employee, message: 'Employee updated successfully.' });
  } catch (err) {
    console.error('Employee update error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    await employee.update({ is_active: false });

    // Also deactivate the user account
    await User.update({ is_active: false }, { where: { employee_id: employee.id } });

    return res.json({ message: 'Employee deactivated successfully.' });
  } catch (err) {
    console.error('Employee delete error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
