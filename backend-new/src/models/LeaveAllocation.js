const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveAllocation = sequelize.define('LeaveAllocation', {
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
  leave_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'leave_types',
      key: 'id',
    },
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  allocated_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
  },
  used_days: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 0,
  },
  remaining_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
  },
}, {
  tableName: 'leave_allocations',
  timestamps: true,
  underscored: true,
});

module.exports = LeaveAllocation;
