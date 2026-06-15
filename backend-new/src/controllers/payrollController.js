const { Op } = require('sequelize');
const { Payslip, Employee, Contract, Allowance, Deduction, Department } = require('../models');
const { getEmployeeRecord } = require('../middleware/permissions');

exports.getPayslips = async (req, res) => {
  try {
    const { page = 1, limit = 20, employee_id, month, year, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (employee_id) where.employee_id = employee_id;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    // RBAC: employee sees only own payslips, manager sees department
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

    const { count, rows } = await Payslip.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'badge_id', 'department_id'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['year', 'DESC'], ['month', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      const emp = json.employee;
      return {
        ...json,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
        department_name: emp?.department?.name || '—',
        period_start: `${json.year}-${String(json.month).padStart(2, '0')}-01`,
        basic_pay: parseFloat(json.basic_salary) || 0,
        allowances: parseFloat(json.total_allowances) || 0,
        deductions: parseFloat(json.total_deductions) || 0,
        net_pay: parseFloat(json.net_salary) || 0,
      };
    });

    return res.json({
      results,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Payslips list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const payslips = await Payslip.findAll();
    const total_paid = payslips.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
    const total_pending = payslips.filter(p => p.status !== 'paid').reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
    const total_net = payslips.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
    return res.json({
      total_paid,
      total_pending,
      total_payslips: payslips.length,
      total_net,
    });
  } catch (err) {
    console.error('Payroll summary error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.confirmPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findByPk(req.params.id);
    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });
    await payslip.update({ status: 'confirmed' });
    return res.json(payslip);
  } catch (err) {
    console.error('Confirm payslip error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.payPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findByPk(req.params.id);
    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });
    await payslip.update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] });
    return res.json(payslip);
  } catch (err) {
    console.error('Pay payslip error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.generatePayslips = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required.' });
    }

    const existing = await Payslip.count({ where: { month: parseInt(month), year: parseInt(year) } });
    if (existing > 0) {
      return res.status(400).json({ error: 'Payslips already generated for this period.' });
    }

    const employees = await Employee.findAll({
      where: { is_active: true },
      include: [
        { model: Contract, as: 'contracts', where: { status: 'active' }, required: false },
      ],
    });

    const allAllowances = await Allowance.findAll();
    const allDeductions = await Deduction.findAll();

    const payslips = [];

    for (const emp of employees) {
      const contract = emp.contracts && emp.contracts.length > 0 ? emp.contracts[0] : null;
      const basicSalary = contract ? parseFloat(contract.basic_salary) : 0;

      const empAllowances = allAllowances.filter(a => a.employee_id === emp.id);
      const totalAllowances = empAllowances.reduce((sum, a) => {
        if (a.type === 'percentage') {
          return sum + (basicSalary * parseFloat(a.amount) / 100);
        }
        return sum + parseFloat(a.amount);
      }, 0);

      const empDeductions = allDeductions.filter(d => d.employee_id === emp.id);
      const totalDeductions = empDeductions.reduce((sum, d) => {
        if (d.type === 'percentage') {
          return sum + (basicSalary * parseFloat(d.amount) / 100);
        }
        return sum + parseFloat(d.amount);
      }, 0);

      const netSalary = basicSalary + totalAllowances - totalDeductions;

      payslips.push({
        employee_id: emp.id,
        month: parseInt(month),
        year: parseInt(year),
        basic_salary: basicSalary,
        total_allowances: totalAllowances,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        status: 'draft',
      });
    }

    const created = await Payslip.bulkCreate(payslips);

    return res.status(201).json({
      data: created,
      message: `Generated ${created.length} payslips for ${month}/${year}.`,
    });
  } catch (err) {
    console.error('Generate payslips error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findByPk(req.params.id);
    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    await payslip.update(req.body);
    return res.json(payslip);
  } catch (err) {
    console.error('Update payslip error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Contract.findAndCountAll({
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
        wage: parseFloat(json.salary) || 0,
        pay_frequency: json.wage_type || 'monthly',
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Contracts list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createContract = async (req, res) => {
  try {
    const contract = await Contract.create(req.body);
    return res.status(201).json(contract);
  } catch (err) {
    console.error('Create contract error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAllowances = async (req, res) => {
  try {
    const allowances = await Allowance.findAll();
    // Flatten for frontend: frontend expects `is_percent`
    const results = allowances.map(a => {
      const json = a.toJSON();
      return {
        ...json,
        is_percent: json.type === 'percentage',
        amount: parseFloat(json.amount) || 0,
      };
    });
    return res.json(results);
  } catch (err) {
    console.error('Allowances error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getDeductions = async (req, res) => {
  try {
    const deductions = await Deduction.findAll();
    // Flatten for frontend: frontend expects `is_percent`
    const results = deductions.map(d => {
      const json = d.toJSON();
      return {
        ...json,
        is_percent: json.type === 'percentage',
        amount: parseFloat(json.amount) || 0,
      };
    });
    return res.json(results);
  } catch (err) {
    console.error('Deductions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
