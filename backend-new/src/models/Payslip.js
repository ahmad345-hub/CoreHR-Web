const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payslip = sequelize.define('Payslip', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  basic_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total_allowances: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total_deductions: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  net_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'confirmed', 'paid'),
    defaultValue: 'draft',
  },
  paid_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'payslips',
  timestamps: true,
  underscored: true,
});

module.exports = Payslip;
