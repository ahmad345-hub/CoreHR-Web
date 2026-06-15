const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id',
    },
  },
  max_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  carry_forward: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#4CAF50',
  },
}, {
  tableName: 'leave_types',
  timestamps: true,
  underscored: true,
});

module.exports = LeaveType;
