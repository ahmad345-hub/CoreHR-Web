const { Op } = require('sequelize');
const { OnboardingStage, OnboardingTask, Employee } = require('../models');

exports.getStages = async (req, res) => {
  try {
    const stages = await OnboardingStage.findAll({ order: [['sequence', 'ASC']] });
    return res.json(stages);
  } catch (err) {
    console.error('Onboarding stages error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    // RBAC: employee sees only own tasks
    const taskWhere = {};
    if (req.user.role === 'employee') {
      taskWhere.employee_id = req.user.employee_id;
    }

    const tasks = await OnboardingTask.findAll({
      where: taskWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id'],
        },
        { model: OnboardingStage, as: 'stage' },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(tasks);
  } catch (err) {
    console.error('Onboarding tasks error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = await OnboardingTask.create(req.body);
    return res.status(201).json(task);
  } catch (err) {
    console.error('Create onboarding task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await OnboardingTask.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await task.update(req.body);
    return res.json(task);
  } catch (err) {
    console.error('Update onboarding task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await OnboardingTask.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    await task.destroy();
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('Delete onboarding task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getRecords = async (req, res) => {
  try {
    // Records are tasks assigned to specific employees
    // RBAC: employee sees only own records
    const recordWhere = { employee_id: { [Op.ne]: null } };
    if (req.user.role === 'employee') {
      recordWhere.employee_id = req.user.employee_id;
    }

    const tasks = await OnboardingTask.findAll({
      where: recordWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id'],
        },
        { model: OnboardingStage, as: 'stage' },
      ],
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend grouping
    const records = tasks.map(t => {
      const json = t.toJSON();
      json.employee_name = json.employee ? `${json.employee.first_name} ${json.employee.last_name}` : null;
      json.task_title = json.title;
      return json;
    });

    return res.json(records);
  } catch (err) {
    console.error('Onboarding records error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const task = await OnboardingTask.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const data = { ...req.body };
    if (data.status === 'completed' && !data.completed_at) {
      data.completed_at = new Date().toISOString();
    }
    await task.update(data);
    return res.json(task);
  } catch (err) {
    console.error('Update onboarding record error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.assignOnboarding = async (req, res) => {
  try {
    const employeeId = req.params.empId;

    // Get all template tasks (tasks not assigned to any employee, or create defaults)
    const templateTasks = await OnboardingTask.findAll({
      where: { employee_id: null },
    });

    if (templateTasks.length === 0) {
      // No template tasks exist, create a basic record
      const task = await OnboardingTask.create({
        title: 'Onboarding Started',
        description: 'Employee onboarding initiated',
        employee_id: employeeId,
        status: 'pending',
      });
      return res.status(201).json([task]);
    }

    // Clone template tasks for this employee
    const newTasks = templateTasks.map(t => ({
      title: t.title,
      description: t.description,
      stage_id: t.stage_id,
      employee_id: employeeId,
      status: 'pending',
      due_date: t.due_date,
    }));

    const created = await OnboardingTask.bulkCreate(newTasks);
    return res.status(201).json(created);
  } catch (err) {
    console.error('Assign onboarding error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
