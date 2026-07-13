const Attendance = require('../models/Attendance');
const WorkingDay = require('../models/WorkingDay');
const { isWithinGeofence } = require('../services/geofence');
const { buildISTDateTime } = require('../utils/timezone');

exports.checkIn = async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;
    const session = await WorkingDay.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.status === 'cancelled') {
      return res.status(400).json({ message: 'Session is cancelled' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session already ended' });
    }

    const now = new Date();
    const sessionStart = buildISTDateTime(session.date, session.startTime);
    const sessionEnd   = buildISTDateTime(session.date, session.endTime);

    // Allow check-in from 15 minutes before start until end
    const graceStart = new Date(sessionStart.getTime() - 15 * 60 * 1000);

    if (now < graceStart || now > sessionEnd) {
      return res.status(400).json({ message: 'Check-in not allowed outside session window' });
    }

    const existing = await Attendance.findOne({ sessionId, userId: req.user._id });
    if (existing && existing.checkIn && existing.checkIn.time) {
      return res.status(400).json({ message: 'Already checked in' });
    }

    let withinGeofence = null;
    if (session.enforceGeofence && session.location?.lat && session.location?.lng) {
      if (!lat || !lng) {
        return res.status(400).json({ message: 'Location required for this session' });
      }
      withinGeofence = isWithinGeofence(
        lat, lng,
        session.location.lat, session.location.lng,
        session.location.radiusMeters || 100
      );
      if (!withinGeofence) {
        return res.status(400).json({ message: 'You are outside the session geofence' });
      }
    }

    // 5-minute leniency: checking in up to 5 min after start = present, after that = late
    const lateThreshold = new Date(sessionStart.getTime() + 5 * 60 * 1000);
    const isLate = now > lateThreshold;

    const record = existing || new Attendance({ sessionId, userId: req.user._id });
    record.checkIn = { time: now, lat, lng, withinGeofence };
    record.status = isLate ? 'late' : 'present';
    await record.save();

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;
    const session = await WorkingDay.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const record = await Attendance.findOne({ sessionId, userId: req.user._id });
    if (!record || !record.checkIn || !record.checkIn.time) {
      return res.status(400).json({ message: 'Must check in first' });
    }
    if (record.checkOut && record.checkOut.time) {
      return res.status(400).json({ message: 'Already checked out' });
    }

    const now = new Date();
    const sessionEnd = buildISTDateTime(session.date, session.endTime);

    record.checkOut = { time: now > sessionEnd ? sessionEnd : now, lat, lng };
    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user._id })
      .populate('sessionId', 'title date startTime endTime')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSessionAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ sessionId: req.params.sessionId })
      .populate('userId', 'name email employeeId department');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.manualUpsert = async (req, res) => {
  try {
    const { sessionId, userId, status, checkIn, checkOut } = req.body;
    let record = await Attendance.findOne({ sessionId, userId });
    if (record) {
      record.status = status || record.status;
      if (checkIn)  record.checkIn  = { ...record.checkIn,  ...checkIn };
      if (checkOut) record.checkOut = { ...record.checkOut, ...checkOut };
    } else {
      record = new Attendance({ sessionId, userId, status, checkIn, checkOut });
    }
    record.isManualEntry = true;
    record.markedBy = req.user._id;
    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserAttendanceHistory = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.params.userId })
      .populate('sessionId', 'title date startTime endTime')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('sessionId', 'title date startTime endTime')
      .populate('userId', 'name email employeeId department')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
