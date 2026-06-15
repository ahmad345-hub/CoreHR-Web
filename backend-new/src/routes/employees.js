const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const employeeController = require('../controllers/employeeController');

router.use(auth);

router.get('/', requireEmployee, checkPermission('employees.view'), employeeController.list);
router.post('/', requireEmployee, checkPermission('employees.create'), employeeController.create);
router.get('/:id', requireEmployee, employeeController.getById);
router.put('/:id', requireEmployee, checkPermission('employees.edit'), employeeController.update);
router.delete('/:id', requireEmployee, checkPermission('employees.delete'), employeeController.remove);
router.get('/:id/attendance', requireEmployee, employeeController.getAttendance);
router.get('/:id/leave', requireEmployee, employeeController.getLeave);

module.exports = router;
