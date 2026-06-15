const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  old_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  new_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
});

module.exports = AuditLog;
