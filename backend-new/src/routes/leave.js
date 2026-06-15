const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const leaveController = require('../controllers/leaveController');

router.use(auth);

router.get('/types', requireEmployee, leaveController.getTypes);
router.post('/types', requireEmployee, checkPermission('leave.manage_types'), leaveController.createType);
router.put('/types/:id', requireEmployee, checkPermission('leave.manage_types'), leaveController.updateType);
router.delete('/types/:id', requireEmployee, checkPermission('leave.manage_types'), leaveController.deleteType);
router.get('/balance', requireEmployee, checkPermission('leave.view'), leaveController.getBalance);
router.get('/allocations', requireEmployee, checkPermission('leave.view'), leaveController.getAllocations);
router.get('/requests', requireEmployee, checkPermission('leave.view'), leaveController.getRequests);
router.post('/requests', requireEmployee, checkPermission('leave.apply'), leaveController.submitRequest);
router.put('/requests/:id/approve', requireEmployee, checkPermission('leave.approve'), leaveController.approveRequest);
router.put('/requests/:id/reject', requireEmployee, checkPermission('leave.approve'), leaveController.rejectRequest);
router.patch('/requests/:id', requireEmployee, checkPermission('leave.approve'), leaveController.updateRequest);
router.delete('/requests/:id', requireEmployee, leaveController.cancelRequest);

module.exports = router;
