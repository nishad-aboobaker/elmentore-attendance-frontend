const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middlewares/auth');

router.use(auth);

// GET /api/chat/messages
router.get('/messages', chatController.getGlobalMessages);

module.exports = router;
