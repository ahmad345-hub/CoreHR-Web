const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Employee, Department, JobPosition, Company, UserPermission } = require('../models');
const { getDefaultPermissions } = require('./permissionController');

const generateToken = (user, employeeId, departmentId) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, employee_id: employeeId || null, department_id: departmentId || null },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({
      where: { username },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: JobPosition, as: 'jobPosition' },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    const validPassword = await user.validatePassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const employeeId = user.employee?.id || null;
    const departmentId = user.employee?.department_id || null;
    const token = generateToken(user, employeeId, departmentId);

    const userData = user.toJSON();
    delete userData.password;

    // Include user permissions
    let permRecord = await UserPermission.findOne({ where: { user_id: user.id } });
    if (!permRecord) {
      const defaults = getDefaultPermissions(user.role);
      permRecord = await UserPermission.create({ user_id: user.id, permissions: defaults });
    }
    userData.permissions = permRecord.permissions;

    return res.json({
      token,
      user: userData,
      message: 'Login successful.',
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive.' });
    }

    const emp = await Employee.findOne({ where: { user_id: user.id } });
    const token = generateToken(user, emp?.id, emp?.department_id);
    return res.json({ data: { token }, message: 'Token refreshed.' });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old password and new password are required.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const validPassword = await user.validatePassword(old_password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: JobPosition, as: 'jobPosition' },
            { model: Company, as: 'company' },
          ],
        },
        {
          model: UserPermission,
          as: 'userPermissions',
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = user.toJSON();
    // Flatten permissions onto user object
    if (userData.userPermissions) {
      userData.permissions = userData.userPermissions.permissions;
      delete userData.userPermissions;
    } else {
      const defaults = getDefaultPermissions(user.role);
      const permRecord = await UserPermission.create({ user_id: user.id, permissions: defaults });
      userData.permissions = permRecord.permissions;
    }

    return res.json(userData);
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
