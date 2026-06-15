const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const attendanceController = require('../controllers/attendanceController');

router.use(auth);

router.post('/clock-in', requireEmployee, checkPermission('attendance.clock'), attendanceController.clockIn);
router.post('/clock-out', requireEmployee, checkPermission('attendance.clock'), attendanceController.clockOut);
router.get('/today', requireEmployee, checkPermission('attendance.view'), attendanceController.today);
router.get('/summary', requireEmployee, checkPermission('attendance.view'), attendanceController.stats);
router.get('/stats', requireEmployee, checkPermission('attendance.view'), attendanceController.stats);
router.get('/my', requireEmployee, checkPermission('attendance.view'), attendanceController.my);
router.get('/', requireEmployee, checkPermission('attendance.manage'), attendanceController.list);

module.exports = router;
