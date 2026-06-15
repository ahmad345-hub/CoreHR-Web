const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Candidate = sequelize.define('Candidate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resume_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  recruitment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'recruitments',
      key: 'id',
    },
  },
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'recruitment_stages',
      key: 'id',
    },
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('applied', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected'),
    defaultValue: 'applied',
  },
}, {
  tableName: 'candidates',
  timestamps: true,
  underscored: true,
});

module.exports = Candidate;
