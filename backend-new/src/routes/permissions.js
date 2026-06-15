const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const permissionController = require('../controllers/permissionController');

router.use(auth);
router.use(requireAdmin);

router.get('/all-permissions', permissionController.getAvailablePermissions);
router.get('/users', permissionController.getUsersPermissions);
router.get('/user/:userId', permissionController.getUserPermissions);
router.put('/user/:userId', permissionController.updateUserPermissions);
router.post('/role-defaults/:userId', permissionController.applyRoleDefaults);

module.exports = router;
