const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee } = require('../middleware/permissions');
const notificationController = require('../controllers/notificationController');

router.use(auth);
router.use(requireEmployee);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.remove);

module.exports = router;
