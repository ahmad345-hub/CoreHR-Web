const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecruitmentStage = sequelize.define('RecruitmentStage', {
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
  recruitment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'recruitments',
      key: 'id',
    },
  },
}, {
  tableName: 'recruitment_stages',
  timestamps: true,
  underscored: true,
});

module.exports = RecruitmentStage;
