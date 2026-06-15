const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  check_in: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  check_out: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'on_leave'),
    defaultValue: 'present',
  },
  worked_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  overtime_hours: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'attendance',
  timestamps: true,
  underscored: true,
});

module.exports = Attendance;
