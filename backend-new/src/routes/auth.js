const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/refresh', auth, authController.refresh);
router.get('/me', auth, authController.me);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
