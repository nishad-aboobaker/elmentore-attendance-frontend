const express = require('express');
const router = express.Router();
const fundController = require('../controllers/fundController');
const { protect, checkRole } = require('../middlewares/auth');

router.use(protect);

router.get('/', fundController.getAllTransactions);
router.post('/', checkRole('admin'), fundController.createTransaction);

module.exports = router;
