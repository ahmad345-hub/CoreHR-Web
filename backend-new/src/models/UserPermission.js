const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPermission = sequelize.define('UserPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'user_permissions',
  timestamps: true,
  underscored: true,
});

module.exports = UserPermission;
