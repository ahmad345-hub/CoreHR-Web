const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Deduction = sequelize.define('Deduction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  is_pretax: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id',
    },
  },
}, {
  tableName: 'deductions',
  timestamps: true,
  underscored: true,
});

module.exports = Deduction;
