const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const reportController = require('../controllers/reportController');

router.use(auth);
router.use(requireEmployee);
router.use(checkPermission('reports.view'));

router.get('/headcount', reportController.headcountReport);
router.get('/attendance', reportController.attendanceReport);
router.get('/leave', reportController.leaveReport);
router.get('/payroll', reportController.payrollReport);
router.get('/recruitment', reportController.recruitmentReport);

module.exports = router;
