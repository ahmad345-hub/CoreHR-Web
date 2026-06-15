const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const assetController = require('../controllers/assetController');

router.use(auth);
router.use(requireEmployee);

router.get('/categories', assetController.getCategories);
router.post('/categories', checkPermission('assets.manage'), assetController.createCategory);
router.get('/allocations', checkPermission('assets.view'), assetController.getAllocations);
router.post('/allocate', checkPermission('assets.manage'), assetController.allocate);
router.post('/return/:id', checkPermission('assets.manage'), assetController.returnAsset);
router.patch('/:id/return', checkPermission('assets.manage'), assetController.returnAsset);
router.get('/', checkPermission('assets.view'), assetController.list);
router.post('/', checkPermission('assets.manage'), assetController.create);
router.delete('/:id', checkPermission('assets.manage'), assetController.deleteAsset);

module.exports = router;
