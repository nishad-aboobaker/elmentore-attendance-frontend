const express = require('express');
const router = express.Router();
const fundController = require('../controllers/fundController');
const auth = require('../middlewares/auth');
const { checkRole } = require('../middlewares/role');

router.use(auth);

router.get('/', fundController.getAllTransactions);
router.post('/', checkRole('admin'), fundController.createTransaction);

module.exports = router;
