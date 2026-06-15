const { Op } = require('sequelize');
const { Project, ProjectTask, Employee } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // RBAC: employee sees only projects they are assigned tasks in
    const projectWhere = {};
    if (req.user.role === 'employee') {
      const assignedTasks = await ProjectTask.findAll({
        where: { assigned_to: req.user.employee_id },
        attributes: ['project_id'],
        group: ['project_id'],
      });
      const projectIds = assignedTasks.map(t => t.project_id);
      projectWhere.id = { [Op.in]: projectIds };
    }

    const { count, rows } = await Project.findAndCountAll({
      where: projectWhere,
      include: [
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name'],
        },
        {
          model: ProjectTask,
          as: 'tasks',
          attributes: ['id', 'status'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend: add total_tasks, completed_tasks
    const results = rows.map(r => {
      const json = r.toJSON();
      const tasks = json.tasks || [];
      return {
        ...json,
        total_tasks: tasks.length,
        completed_tasks: tasks.filter(t => t.status === 'done').length,
      };
    });

    return res.json({
      results,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Projects list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    return res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await ProjectTask.findAll({
      where: { project_id: req.params.id },
      include: [
        {
          model: Employee,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(tasks);
  } catch (err) {
    console.error('Project tasks error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = await ProjectTask.create({
      ...req.body,
      project_id: req.params.id,
    });
    return res.status(201).json(task);
  } catch (err) {
    console.error('Create project task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await ProjectTask.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await task.update(req.body);
    return res.json(task);
  } catch (err) {
    console.error('Update project task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await ProjectTask.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    await task.destroy();
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('Delete project task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Timesheets - stored in memory since there's no Timesheet model
const timesheets = [];
let tsIdCounter = 1;

exports.getTimesheets = async (req, res) => {
  try {
    // Enrich timesheets with employee/project/task names
    const enriched = [];
    for (const ts of timesheets) {
      const entry = { ...ts };
      // Get employee name
      if (ts.employee_id) {
        const emp = await Employee.findByPk(ts.employee_id, { attributes: ['first_name', 'last_name'] });
        entry.employee_name = emp ? `${emp.first_name} ${emp.last_name}` : '—';
      }
      // Get project name
      if (ts.project_id) {
        const proj = await Project.findByPk(ts.project_id, { attributes: ['name'] });
        entry.project_name = proj ? proj.name : '—';
      }
      // Get task title
      if (ts.task_id) {
        const task = await ProjectTask.findByPk(ts.task_id, { attributes: ['title'] });
        entry.task_title = task ? task.title : '—';
      }
      enriched.push(entry);
    }
    return res.json(enriched);
  } catch (err) {
    console.error('Get timesheets error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTimesheet = async (req, res) => {
  try {
    const entry = {
      id: tsIdCounter++,
      ...req.body,
      employee_id: req.user.employee_id,
      created_at: new Date().toISOString(),
    };
    timesheets.push(entry);
    return res.status(201).json(entry);
  } catch (err) {
    console.error('Create timesheet error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
