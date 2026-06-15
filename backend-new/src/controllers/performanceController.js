const { Op } = require('sequelize');
const { PerformanceGoal, Feedback, Employee } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.getGoals = async (req, res) => {
  try {
    const { page = 1, limit = 20, employee_id, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    // RBAC: employee sees only own goals, manager sees department
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

    const { count, rows } = await PerformanceGoal.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      const emp = json.employee;
      return {
        ...json,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Goals error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const goal = await PerformanceGoal.create(req.body);
    return res.status(201).json(goal);
  } catch (err) {
    console.error('Create goal error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const goal = await PerformanceGoal.findByPk(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    await goal.update(req.body);
    return res.json(goal);
  } catch (err) {
    console.error('Update goal error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // RBAC filtering for feedback
    const feedbackWhere = {};
    if (req.user.role === 'employee') {
      // Employee sees feedback they gave or received
      feedbackWhere[Op.or] = [
        { from_employee_id: req.user.employee_id },
        { to_employee_id: req.user.employee_id },
      ];
    } else if (req.user.role === 'manager') {
      const emp = await getEmployeeRecord(req);
      if (emp && emp.department_id) {
        const deptEmployees = await Employee.findAll({
          where: { department_id: emp.department_id },
          attributes: ['id'],
        });
        const deptIds = deptEmployees.map(e => e.id);
        feedbackWhere[Op.or] = [
          { from_employee_id: { [Op.in]: deptIds } },
          { to_employee_id: { [Op.in]: deptIds } },
        ];
      }
    }

    const { count, rows } = await Feedback.findAndCountAll({
      where: feedbackWhere,
      include: [
        {
          model: Employee,
          as: 'toEmployee',
          attributes: ['id', 'first_name', 'last_name'],
        },
        {
          model: Employee,
          as: 'fromEmployee',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      const toEmp = json.toEmployee;
      const fromEmp = json.fromEmployee;
      return {
        ...json,
        employee_name: toEmp ? `${toEmp.first_name} ${toEmp.last_name}` : '—',
        reviewer_name: fromEmp ? `${fromEmp.first_name} ${fromEmp.last_name}` : '—',
        feedback_type: json.period || 'general',
        created_at: json.createdAt || json.created_at,
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Feedback list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await PerformanceGoal.findByPk(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    await goal.destroy();
    return res.json({ message: 'Goal deleted.' });
  } catch (err) {
    console.error('Delete goal error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const data = { ...req.body };
    // Map frontend field names to model field names
    if (data.employee_id && !data.to_employee_id) {
      data.to_employee_id = data.employee_id;
      delete data.employee_id;
    }
    if (!data.from_employee_id) {
      data.from_employee_id = req.user.employee_id || data.reviewer_id;
    }
    // Store feedback_type in period field
    if (data.feedback_type) {
      data.period = data.feedback_type;
    }
    delete data.reviewer_id;
    delete data.feedback_type;
    const feedback = await Feedback.create(data);
    return res.status(201).json(feedback);
  } catch (err) {
    console.error('Submit feedback error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
