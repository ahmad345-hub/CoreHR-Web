const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PerformanceGoal = sequelize.define('PerformanceGoal', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active',
  },
}, {
  tableName: 'performance_goals',
  timestamps: true,
  underscored: true,
});

module.exports = PerformanceGoal;
