const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OffboardingRecord = sequelize.define('OffboardingRecord', {
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
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'offboarding_stages',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  exit_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'offboarding_records',
  timestamps: true,
  underscored: true,
});

module.exports = OffboardingRecord;
