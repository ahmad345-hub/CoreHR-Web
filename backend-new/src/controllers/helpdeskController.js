const { Op } = require('sequelize');
const { HelpdeskTicket, Employee } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, employee_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (employee_id) where.employee_id = employee_id;

    // RBAC: employee sees only own tickets, manager sees department
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

    const { count, rows } = await HelpdeskTicket.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id'],
        },
        {
          model: Employee,
          as: 'assignee',
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
      const emp = json.employee;
      return {
        ...json,
        // Frontend reads tk.subject but model stores as title
        subject: json.title,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
        category_name: json.category || '—',
        created_at: json.createdAt || json.created_at,
      };
    });

    return res.json({
      results,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Tickets list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const data = { ...req.body };
    // Map category_id to category string if needed
    if (data.category_id && !data.category) {
      data.category = data.category_id;
      delete data.category_id;
    }
    // Map subject to title if needed
    if (data.subject && !data.title) {
      data.title = data.subject;
      delete data.subject;
    }
    const ticket = await HelpdeskTicket.create({
      ...data,
      employee_id: data.employee_id || req.user.employee_id,
      status: 'open',
    });
    return res.status(201).json(ticket);
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await HelpdeskTicket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    await ticket.update(req.body);
    return res.json(ticket);
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await HelpdeskTicket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    await ticket.destroy();
    return res.json({ message: 'Ticket deleted.' });
  } catch (err) {
    console.error('Delete ticket error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await HelpdeskTicket.findAll({
      attributes: [[HelpdeskTicket.sequelize.fn('DISTINCT', HelpdeskTicket.sequelize.col('category')), 'name']],
      where: { category: { [Op.ne]: null } },
      raw: true,
    });

    // Return as array of {id, name} objects for frontend dropdown
    return res.json(categories.map((c, i) => ({ id: c.name, name: c.name })));
  } catch (err) {
    console.error('Categories error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    // Categories are stored as strings on tickets, so just return the created category object
    const { name, description } = req.body;
    return res.status(201).json({ id: name, name, description: description || '' });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
