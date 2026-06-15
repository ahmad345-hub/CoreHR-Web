const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssetAllocation = sequelize.define('AssetAllocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  asset_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'assets',
      key: 'id',
    },
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  allocated_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  return_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'returned'),
    defaultValue: 'active',
  },
}, {
  tableName: 'asset_allocations',
  timestamps: true,
  underscored: true,
});

module.exports = AssetAllocation;
