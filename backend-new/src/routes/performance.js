const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const performanceController = require('../controllers/performanceController');

router.use(auth);
router.use(requireEmployee);

router.get('/goals', checkPermission('performance.view'), performanceController.getGoals);
router.post('/goals', checkPermission('performance.manage'), performanceController.createGoal);
router.put('/goals/:id', checkPermission('performance.manage'), performanceController.updateGoal);
router.patch('/goals/:id', checkPermission('performance.manage'), performanceController.updateGoal);
router.delete('/goals/:id', checkPermission('performance.manage'), performanceController.deleteGoal);
router.get('/feedback', checkPermission('performance.view'), performanceController.getFeedback);
router.post('/feedback', checkPermission('performance.view'), performanceController.submitFeedback);

module.exports = router;
