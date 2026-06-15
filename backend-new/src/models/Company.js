const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tax_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'companies',
  timestamps: true,
  underscored: true,
});

module.exports = Company;
