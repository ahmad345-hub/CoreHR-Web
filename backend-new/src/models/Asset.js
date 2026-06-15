const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  purchase_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('available', 'allocated', 'maintenance', 'retired'),
    defaultValue: 'available',
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
  tableName: 'assets',
  timestamps: true,
  underscored: true,
});

module.exports = Asset;
