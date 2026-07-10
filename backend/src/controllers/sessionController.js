const WorkingDay = require('../models/WorkingDay');

/**
 * Parse "HH:MM" string into a Date using LOCAL time (no UTC offset issues).
 */
function buildLocalDateTime(sessionDate, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(sessionDate);
  d.setHours(h, m, 0, 0); // local hours
  return d;
}

/**
 * Auto-update session statuses based on today's local date and time.
 *
 * upcoming → active    : session date is today AND now is between startTime and endTime
 *                        (with 15-min early grace, same as check-in window)
 * active   → completed : session date is today AND now is past endTime
 *                      : session date is before today (missed/overdue)
 */
async function autoUpdateStatuses() {
  const now = new Date();

  // Get today's date string in local time ("YYYY-MM-DD")
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d  = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${mo}-${d}`;

  const sessions = await WorkingDay.find({
    status: { $in: ['upcoming', 'active'] }
  });

  for (const session of sessions) {
    const sessionDate = new Date(session.date);
    const sy  = sessionDate.getFullYear();
    const smo = String(sessionDate.getMonth() + 1).padStart(2, '0');
    const sd  = String(sessionDate.getDate()).padStart(2, '0');
    const sessionDateStr = `${sy}-${smo}-${sd}`;

    const startTime = buildLocalDateTime(session.date, session.startTime);
    const endTime   = buildLocalDateTime(session.date, session.endTime);

    // 15-min grace before start (same window as check-in)
    const graceStart = new Date(startTime.getTime() - 15 * 60 * 1000);

    if (session.status === 'upcoming') {
      // Activate only when today matches AND we are within the grace+end window
      if (sessionDateStr === todayStr && now >= graceStart && now <= endTime) {
        await WorkingDay.findByIdAndUpdate(session._id, { status: 'active' });
      }
    }

    if (session.status === 'active') {
      // Complete if past endTime today
      if (sessionDateStr === todayStr && now > endTime) {
        await WorkingDay.findByIdAndUpdate(session._id, { status: 'completed' });
      }
      // Complete if session date is in the past
      if (sessionDateStr < todayStr) {
        await WorkingDay.findByIdAndUpdate(session._id, { status: 'completed' });
      }
    }
  }
}

exports.create = async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    const session = await WorkingDay.create(data);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    await autoUpdateStatuses();

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const sessions = await WorkingDay.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    await autoUpdateStatuses();

    const session = await WorkingDay.findById(req.params.id)
      .populate('createdBy', 'name email');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const session = await WorkingDay.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const session = await WorkingDay.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
