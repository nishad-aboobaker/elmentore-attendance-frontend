const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');
const { checkRole } = require('../middlewares/role');

// User subscribes to push notifications
router.post('/subscribe', auth, notificationController.subscribe);

// Admin sends custom push notification
router.post('/send-custom', auth, checkRole('admin'), notificationController.sendCustom);

module.exports = router;
