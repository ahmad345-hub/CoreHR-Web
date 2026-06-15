const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recruitment = sequelize.define('Recruitment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  job_position_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'job_positions',
      key: 'id',
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  vacancies: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'on_hold'),
    defaultValue: 'open',
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
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
  tableName: 'recruitments',
  timestamps: true,
  underscored: true,
});

module.exports = Recruitment;
