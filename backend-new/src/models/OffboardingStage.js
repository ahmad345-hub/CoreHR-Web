const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OffboardingStage = sequelize.define('OffboardingStage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sequence: {
    type: DataTypes.INTEGER,
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
}, {
  tableName: 'offboarding_stages',
  timestamps: true,
  underscored: true,
});

module.exports = OffboardingStage;
