const { Op } = require('sequelize');
const { LeaveType, LeaveAllocation, LeaveRequest, Employee, Department } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.getTypes = async (req, res) => {
  try {
    const types = await LeaveType.findAll({ order: [['name', 'ASC']] });
    // Flatten for frontend: map model fields to what frontend expects
    const results = types.map(t => {
      const json = t.toJSON();
      return {
        ...json,
        total_days: json.max_days,
        carryforward: json.carry_forward,
        paid: json.is_paid,
      };
    });
    return res.json(results);
  } catch (err) {
    console.error('Leave types error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getBalance = async (req, res) => {
  try {
    // RBAC: admin sees all, manager sees department, employee sees own
    let balanceWhere = {};
    if (req.user.role === 'admin') {
      // No filter
      if (req.query.employee_id) balanceWhere.employee_id = req.query.employee_id;
    } else if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (!emp) return res.status(400).json({ error: 'No employee linked to this user.' });
      // Get all employees in the manager's department
      const deptEmployees = await Employee.findAll({
        where: { department_id: emp.department_id },
        attributes: ['id'],
      });
      balanceWhere.employee_id = { [Op.in]: deptEmployees.map(e => e.id) };
    } else {
      const employeeId = req.user.employee_id;
      if (!employeeId) {
        return res.status(400).json({ error: 'No employee linked to this user.' });
      }
      balanceWhere.employee_id = employeeId;
    }

    const allocations = await LeaveAllocation.findAll({
      where: balanceWhere,
      include: [{ model: LeaveType, as: 'leaveType' }],
    });

    return res.json(allocations);
  } catch (err) {
    console.error('Leave balance error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, employee_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (employee_id) where.employee_id = employee_id;

    // RBAC: employee sees only own requests, manager sees department
    if (req.user.role === 'employee') {
      where.employee_id = req.user.employee_id;
    } else if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        const deptEmployees = await Employee.findAll({
          where: { department_id: emp.department_id },
          attributes: ['id'],
        });
        where.employee_id = { [Op.in]: deptEmployees.map(e => e.id) };
      }
    }

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id', 'profile_image', 'department_id'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
          ],
        },
        { model: LeaveType, as: 'leaveType' },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      const emp = json.employee;
      const lt = json.leaveType;
      return {
        ...json,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
        department_name: emp?.department?.name || '—',
        leave_type_name: lt?.name || '—',
      };
    });

    return res.json({
      results,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Leave requests error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAllocations = async (req, res) => {
  try {
    // RBAC filtering
    const allocWhere = {};
    if (req.user.role === 'employee') {
      allocWhere.employee_id = req.user.employee_id;
    } else if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        const deptEmployees = await Employee.findAll({
          where: { department_id: emp.department_id },
          attributes: ['id'],
        });
        allocWhere.employee_id = { [Op.in]: deptEmployees.map(e => e.id) };
      }
    }

    const allocations = await LeaveAllocation.findAll({
      where: allocWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name'],
        },
        { model: LeaveType, as: 'leaveType', attributes: ['id', 'name'] },
      ],
      order: [['year', 'DESC']],
    });

    // Flatten for frontend
    const results = allocations.map(a => {
      const json = a.toJSON();
      const emp = json.employee;
      const lt = json.leaveType;
      return {
        ...json,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
        leave_type_name: lt?.name || '—',
        total_days: parseFloat(json.allocated_days) || 0,
        used_days: parseFloat(json.used_days) || 0,
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Leave allocations error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.submitRequest = async (req, res) => {
  try {
    const employeeId = req.body.employee_id || req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee linked to this user.' });
    }

    const { leave_type_id, start_date, end_date, reason } = req.body;

    // Calculate number of days
    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    const allocation = await LeaveAllocation.findOne({
      where: { employee_id: employeeId, leave_type_id },
    });

    if (!allocation) {
      return res.status(400).json({ error: 'No leave allocation found for this leave type.' });
    }

    if (allocation.remaining_days < totalDays) {
      return res.status(400).json({
        error: `Insufficient leave balance. Available: ${allocation.remaining_days}, Requested: ${totalDays}`,
      });
    }

    const request = await LeaveRequest.create({
      employee_id: employeeId,
      leave_type_id,
      start_date,
      end_date,
      days: totalDays,
      reason,
      status: 'pending',
    });

    return res.status(201).json({ data: request, message: 'Leave request submitted.' });
  } catch (err) {
    console.error('Submit leave error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (['approved', 'rejected'].includes(status) && !['admin', 'manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to approve/reject leave requests.' });
    }

    const request = await LeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    await request.update({ status, approved_by: req.user.id });

    // If approved, update allocation
    if (status === 'approved') {
      const allocation = await LeaveAllocation.findOne({
        where: { employee_id: request.employee_id, leave_type_id: request.leave_type_id },
      });

      if (allocation) {
        await allocation.update({
          used_days: parseFloat(allocation.used_days) + parseFloat(request.days),
          remaining_days: parseFloat(allocation.remaining_days) - parseFloat(request.days),
        });
      }
    }

    return res.json({ data: request, message: `Leave request ${status}.` });
  } catch (err) {
    console.error('Update leave error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!['admin', 'manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to approve leave requests.' });
    }

    const request = await LeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    await request.update({ status: 'approved', approved_by: req.user.id });

    // Update allocation
    const allocation = await LeaveAllocation.findOne({
      where: { employee_id: request.employee_id, leave_type_id: request.leave_type_id },
    });
    if (allocation) {
      await allocation.update({
        used_days: parseFloat(allocation.used_days) + parseFloat(request.days),
        remaining_days: parseFloat(allocation.remaining_days) - parseFloat(request.days),
      });
    }

    return res.json({ data: request, message: 'Leave request approved.' });
  } catch (err) {
    console.error('Approve leave error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!['admin', 'manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to reject leave requests.' });
    }

    const request = await LeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    await request.update({ status: 'rejected', approved_by: req.user.id });
    return res.json({ data: request, message: 'Leave request rejected.' });
  } catch (err) {
    console.error('Reject leave error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createType = async (req, res) => {
  try {
    const data = { ...req.body };
    // Map frontend fields to model fields
    if (data.total_days !== undefined && data.max_days === undefined) {
      data.max_days = data.total_days;
      delete data.total_days;
    }
    if (data.carryforward !== undefined && data.carry_forward === undefined) {
      data.carry_forward = data.carryforward;
      delete data.carryforward;
    }
    if (data.paid !== undefined && data.is_paid === undefined) {
      data.is_paid = data.paid;
      delete data.paid;
    }
    // Set company_id from first company if not provided
    if (!data.company_id) {
      const { Company } = require('../models');
      const company = await Company.findOne();
      if (company) data.company_id = company.id;
    }
    const type = await LeaveType.create(data);
    return res.status(201).json(type);
  } catch (err) {
    console.error('Create leave type error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateType = async (req, res) => {
  try {
    const type = await LeaveType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ error: 'Leave type not found.' });
    }
    const data = { ...req.body };
    if (data.total_days !== undefined && data.max_days === undefined) {
      data.max_days = data.total_days;
      delete data.total_days;
    }
    if (data.carryforward !== undefined && data.carry_forward === undefined) {
      data.carry_forward = data.carryforward;
      delete data.carryforward;
    }
    if (data.paid !== undefined && data.is_paid === undefined) {
      data.is_paid = data.paid;
      delete data.paid;
    }
    await type.update(data);
    return res.json(type);
  } catch (err) {
    console.error('Update leave type error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteType = async (req, res) => {
  try {
    const type = await LeaveType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ error: 'Leave type not found.' });
    }
    await type.destroy();
    return res.json({ message: 'Leave type deleted.' });
  } catch (err) {
    console.error('Delete leave type error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await LeaveRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (request.employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Can only cancel your own leave requests.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests.' });
    }

    await request.update({ status: 'cancelled' });

    return res.json({ message: 'Leave request cancelled.' });
  } catch (err) {
    console.error('Cancel leave error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
