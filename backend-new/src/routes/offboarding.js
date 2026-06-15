const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const offboardingController = require('../controllers/offboardingController');

router.use(auth);
router.use(requireEmployee);

router.get('/stages', checkPermission('offboarding.view'), offboardingController.getStages);
router.get('/tasks', checkPermission('offboarding.view'), offboardingController.getTasks);
router.post('/tasks', checkPermission('offboarding.manage'), offboardingController.createTask);
router.delete('/tasks/:id', checkPermission('offboarding.manage'), offboardingController.deleteTask);
router.get('/records', offboardingController.getRecords);
router.post('/records', checkPermission('offboarding.manage'), offboardingController.createRecord);
router.put('/records/:id', offboardingController.updateRecord);
router.patch('/records/:id', offboardingController.updateRecord);
router.post('/assign/:employee_id', checkPermission('offboarding.manage'), offboardingController.assignOffboarding);

module.exports = router;
