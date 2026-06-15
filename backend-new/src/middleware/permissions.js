const { Employee } = require('../models');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Roles: admin, manager, employee
 */

// Generic role check middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Convenience shortcuts
const requireAdmin = requireRole('admin');
const requireManager = requireRole('admin', 'manager');
const requireEmployee = requireRole('admin', 'manager', 'employee');

/**
 * Helper: get the current user's Employee record (cached on req)
 */
const getEmployeeRecord = async (req) => {
  if (req._employeeRecord !== undefined) return req._employeeRecord;
  const emp = await Employee.findOne({ where: { user_id: req.user.id } });
  req._employeeRecord = emp || null;
  return req._employeeRecord;
};

/**
 * Get department filter based on role.
 * - admin: null (no filter, sees everything)
 * - manager: { department_id: <their dept> }
 * - employee: { employee_id: <their emp id> }
 */
const getDepartmentFilter = async (req) => {
  if (req.user.role === 'admin') return null;

  const emp = await getEmployeeRecord(req);
  if (!emp) return { employee_id: -1 }; // no employee linked, block all

  if (req.user.role === 'manager') {
    return { department_id: emp.department_id };
  }

  // employee role
  return { employee_id: emp.id };
};

/**
 * Custom permission check middleware.
 * Admin always has access. For others, check user_permissions table.
 */
const checkPermission = (permKey) => {
  return async (req, res, next) => {
    // Admin always has access
    if (req.user.role === 'admin') return next();

    // Check user's custom permissions
    const { UserPermission } = require('../models');
    const userPerm = await UserPermission.findOne({ where: { user_id: req.user.id } });

    if (userPerm && userPerm.permissions && userPerm.permissions[permKey] === true) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied. You do not have permission for this action.' });
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireManager,
  requireEmployee,
  getEmployeeRecord,
  getDepartmentFilter,
  checkPermission,
};
