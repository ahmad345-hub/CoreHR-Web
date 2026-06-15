const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OnboardingStage = sequelize.define('OnboardingStage', {
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
  tableName: 'onboarding_stages',
  timestamps: true,
  underscored: true,
});

module.exports = OnboardingStage;
