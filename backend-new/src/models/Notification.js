const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'system',
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
});

module.exports = Notification;
