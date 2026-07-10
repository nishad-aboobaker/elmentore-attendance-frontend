const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middlewares/auth');
const { checkRole } = require('../middlewares/role');

router.use(auth);

router.post('/checkin', attendanceController.checkIn);
router.post('/checkout', attendanceController.checkOut);
router.get('/my', attendanceController.getMyAttendance);
router.get('/session/:sessionId', checkRole('admin'), attendanceController.getSessionAttendance);
router.get('/user/:userId', checkRole('admin'), attendanceController.getUserAttendanceHistory);
router.get('/all', checkRole('admin'), attendanceController.getAllAttendance);
router.post('/manual', checkRole('admin'), attendanceController.manualUpsert);

module.exports = router;
