const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const { checkRole } = require('../middlewares/role');

router.use(auth);
router.use(checkRole('admin'));

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.patch('/:id/toggle-active', userController.toggleActive);

module.exports = router;
