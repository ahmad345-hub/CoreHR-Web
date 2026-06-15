const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  contract_type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern'),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  wage_type: {
    type: DataTypes.ENUM('monthly', 'hourly', 'commission'),
    defaultValue: 'monthly',
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'terminated'),
    defaultValue: 'active',
  },
  document_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'contracts',
  timestamps: true,
  underscored: true,
});

module.exports = Contract;
