const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  badge_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true,
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true,
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
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  job_position_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'job_positions',
      key: 'id',
    },
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'companies',
      key: 'id',
    },
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  date_of_joining: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  work_type: {
    type: DataTypes.ENUM('on_site', 'remote', 'hybrid'),
    allowNull: true,
  },
  shift: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  basic_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  profile_image: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'employees',
  timestamps: true,
  underscored: true,
});

module.exports = Employee;
