const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee } = require('../middleware/permissions');
const dashboardController = require('../controllers/dashboardController');

router.use(auth);
router.use(requireEmployee);

router.get('/stats', dashboardController.getStats);
router.get('/announcements', dashboardController.getAnnouncements);
router.get('/birthdays', dashboardController.getBirthdays);
router.get('/holidays', dashboardController.getHolidays);
router.get('/attendance-trend', dashboardController.getAttendanceTrend);
router.get('/department-distribution', dashboardController.getDepartmentDistribution);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
