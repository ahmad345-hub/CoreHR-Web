const { Op } = require('sequelize');
const { OffboardingStage, OffboardingRecord, Employee } = require('../models');

exports.getStages = async (req, res) => {
  try {
    const stages = await OffboardingStage.findAll({ order: [['sequence', 'ASC']] });
    return res.json(stages);
  } catch (err) {
    console.error('Offboarding stages error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// In-memory offboarding task templates (no dedicated model)
let offboardingTasks = [];
let offTaskIdCounter = 1;

exports.getTasks = async (req, res) => {
  try {
    return res.json(offboardingTasks);
  } catch (err) {
    console.error('Offboarding tasks error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = {
      id: offTaskIdCounter++,
      ...req.body,
      created_at: new Date().toISOString(),
    };
    offboardingTasks.push(task);
    return res.status(201).json(task);
  } catch (err) {
    console.error('Create offboarding task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    offboardingTasks = offboardingTasks.filter(t => t.id !== id);
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('Delete offboarding task error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getRecords = async (req, res) => {
  try {
    // RBAC: employee sees only own records
    const recordWhere = {};
    if (req.user.role === 'employee') {
      recordWhere.employee_id = req.user.employee_id;
    }

    const records = await OffboardingRecord.findAll({
      where: recordWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id'],
        },
        { model: OffboardingStage, as: 'stage' },
      ],
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend grouping
    const result = records.map(r => {
      const json = r.toJSON();
      json.employee_name = json.employee ? `${json.employee.first_name} ${json.employee.last_name}` : null;
      json.task_title = json.title || json.stage?.name || 'Task';
      json.is_required = json.is_required !== undefined ? json.is_required : true;
      return json;
    });

    return res.json(result);
  } catch (err) {
    console.error('Offboarding records error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createRecord = async (req, res) => {
  try {
    const record = await OffboardingRecord.create(req.body);
    return res.status(201).json(record);
  } catch (err) {
    console.error('Create offboarding record error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const record = await OffboardingRecord.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const data = { ...req.body };
    if (data.status === 'completed' && !data.completed_at) {
      data.completed_at = new Date().toISOString();
    }
    await record.update(data);
    return res.json(record);
  } catch (err) {
    console.error('Update offboarding record error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.assignOffboarding = async (req, res) => {
  try {
    const employeeId = req.params.employee_id;
    const { exit_date } = req.body;

    // First check if there are in-memory task templates
    if (offboardingTasks.length > 0) {
      const records = offboardingTasks.map(t => ({
        employee_id: employeeId,
        title: t.title,
        is_required: t.is_required !== undefined ? t.is_required : true,
        status: 'pending',
        exit_date: exit_date || null,
      }));
      const created = await OffboardingRecord.bulkCreate(records);
      return res.status(201).json(created);
    }

    // Otherwise get all offboarding stages
    const stages = await OffboardingStage.findAll({ order: [['sequence', 'ASC']] });

    if (stages.length === 0) {
      const record = await OffboardingRecord.create({
        employee_id: employeeId,
        title: 'Offboarding Started',
        status: 'pending',
        exit_date: exit_date || null,
      });
      return res.status(201).json([record]);
    }

    // Create a record for each stage
    const records = stages.map(s => ({
      employee_id: employeeId,
      stage_id: s.id,
      title: s.name,
      status: 'pending',
      exit_date: exit_date || null,
    }));

    const created = await OffboardingRecord.bulkCreate(records);
    return res.status(201).json(created);
  } catch (err) {
    console.error('Assign offboarding error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
