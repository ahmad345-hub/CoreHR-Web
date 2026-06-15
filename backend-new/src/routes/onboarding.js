const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const onboardingController = require('../controllers/onboardingController');

router.use(auth);
router.use(requireEmployee);

router.get('/stages', checkPermission('onboarding.view'), onboardingController.getStages);
router.get('/tasks', onboardingController.getTasks);
router.post('/tasks', checkPermission('onboarding.manage'), onboardingController.createTask);
router.delete('/tasks/:id', checkPermission('onboarding.manage'), onboardingController.deleteTask);
router.patch('/tasks/:id', onboardingController.updateTask);
router.get('/records', onboardingController.getRecords);
router.put('/records/:id', onboardingController.updateRecord);
router.patch('/records/:id', onboardingController.updateRecord);
router.post('/assign/:empId', checkPermission('onboarding.manage'), onboardingController.assignOnboarding);

module.exports = router;
