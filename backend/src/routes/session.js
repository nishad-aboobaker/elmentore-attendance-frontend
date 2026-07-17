const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const auth = require('../middlewares/auth');
const { checkRole } = require('../middlewares/role');

router.use(auth);

router.get('/', sessionController.getAll);
router.get('/:id', sessionController.getById);
router.post('/', checkRole('admin'), sessionController.create);
router.put('/:id', checkRole('admin'), sessionController.update);
router.patch('/:id/cancel', checkRole('admin'), sessionController.cancel);
router.delete('/:id', checkRole('admin'), sessionController.delete);

module.exports = router;
