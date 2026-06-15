const { Company, Department, JobPosition, Holiday } = require('../models');

exports.get = async (req, res) => {
  try {
    const company = await Company.findOne();
    if (!company) {
      return res.status(404).json({ error: 'No company settings found.' });
    }
    return res.json(company);
  } catch (err) {
    console.error('Settings get error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Companies
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({ order: [['name', 'ASC']] });
    return res.json(companies);
  } catch (err) {
    console.error('Settings companies error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);
    return res.status(201).json(company);
  } catch (err) {
    console.error('Create company error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    await company.update(req.body);
    return res.json(company);
  } catch (err) {
    console.error('Update company error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    await company.destroy();
    return res.json({ message: 'Company deleted.' });
  } catch (err) {
    console.error('Delete company error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [['name', 'ASC']] });
    return res.json(departments);
  } catch (err) {
    console.error('Settings departments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    return res.status(201).json(department);
  } catch (err) {
    console.error('Create department error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ error: 'Department not found.' });
    await department.update(req.body);
    return res.json(department);
  } catch (err) {
    console.error('Update department error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ error: 'Department not found.' });
    await department.destroy();
    return res.json({ message: 'Department deleted.' });
  } catch (err) {
    console.error('Delete department error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Job Positions
exports.getJobPositions = async (req, res) => {
  try {
    const positions = await JobPosition.findAll({ order: [['title', 'ASC']] });
    return res.json(positions);
  } catch (err) {
    console.error('Settings job positions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const position = await JobPosition.create(req.body);
    return res.status(201).json(position);
  } catch (err) {
    console.error('Create position error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    const position = await JobPosition.findByPk(req.params.id);
    if (!position) return res.status(404).json({ error: 'Position not found.' });
    await position.update(req.body);
    return res.json(position);
  } catch (err) {
    console.error('Update position error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deletePosition = async (req, res) => {
  try {
    const position = await JobPosition.findByPk(req.params.id);
    if (!position) return res.status(404).json({ error: 'Position not found.' });
    await position.destroy();
    return res.json({ message: 'Position deleted.' });
  } catch (err) {
    console.error('Delete position error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Shifts (static data for now)
const shiftsData = [
  { id: 1, name: 'Morning', start_time: '08:00', end_time: '16:00' },
  { id: 2, name: 'Evening', start_time: '16:00', end_time: '00:00' },
  { id: 3, name: 'Night', start_time: '00:00', end_time: '08:00' },
];

exports.getShifts = async (req, res) => {
  return res.json(shiftsData);
};

exports.createShift = async (req, res) => {
  const shift = { id: shiftsData.length + 1, ...req.body };
  shiftsData.push(shift);
  return res.status(201).json(shift);
};

exports.updateShift = async (req, res) => {
  const idx = shiftsData.findIndex(s => s.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Shift not found.' });
  Object.assign(shiftsData[idx], req.body);
  return res.json(shiftsData[idx]);
};

exports.deleteShift = async (req, res) => {
  const idx = shiftsData.findIndex(s => s.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Shift not found.' });
  shiftsData.splice(idx, 1);
  return res.json({ message: 'Shift deleted.' });
};

// Work Types (static data)
const workTypesData = [
  { id: 1, name: 'On-site' },
  { id: 2, name: 'Remote' },
  { id: 3, name: 'Hybrid' },
];

exports.getWorkTypes = async (req, res) => {
  return res.json(workTypesData);
};

// Holidays
exports.getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({ order: [['date', 'ASC']] });
    return res.json(holidays);
  } catch (err) {
    console.error('Settings holidays error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    return res.status(201).json(holiday);
  } catch (err) {
    console.error('Create holiday error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) return res.status(404).json({ error: 'Holiday not found.' });
    await holiday.update(req.body);
    return res.json(holiday);
  } catch (err) {
    console.error('Update holiday error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) return res.status(404).json({ error: 'Holiday not found.' });
    await holiday.destroy();
    return res.json({ message: 'Holiday deleted.' });
  } catch (err) {
    console.error('Delete holiday error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create(req.body);
    } else {
      await company.update(req.body);
    }
    return res.json(company);
  } catch (err) {
    console.error('Settings update error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
