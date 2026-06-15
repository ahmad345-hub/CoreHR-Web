const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OnboardingTask = sequelize.define('OnboardingTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'onboarding_stages',
      key: 'id',
    },
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending',
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'onboarding_tasks',
  timestamps: true,
  underscored: true,
});

module.exports = OnboardingTask;
