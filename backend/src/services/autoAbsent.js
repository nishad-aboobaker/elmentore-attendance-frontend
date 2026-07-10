const cron = require('node-cron');
const WorkingDay = require('../models/WorkingDay');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

const scheduleAutoAbsent = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const sessions = await WorkingDay.find({
        status: { $in: ['upcoming', 'active'] },
        date: { $lte: now }
      });

      for (const session of sessions) {
        const [endH, endM] = session.endTime.split(':').map(Number);
        const sessionEnd = new Date(session.date);
        sessionEnd.setUTCHours(endH, endM, 0, 0);

        if (now < sessionEnd) continue;

        const activeUsers = await User.find({ isActive: true, role: 'employee' }).select('_id');
        const userIds = activeUsers.map(u => u._id);

        const existingRecords = await Attendance.find({ sessionId: session._id }).select('userId');
        const existingUserIds = existingRecords.map(r => r.userId.toString());

        const absentRecords = userIds
          .filter(id => !existingUserIds.includes(id.toString()))
          .map(userId => ({
            sessionId: session._id,
            userId,
            status: 'absent',
            isManualEntry: false
          }));

        if (absentRecords.length > 0) {
          await Attendance.insertMany(absentRecords);
          console.log(`Auto-absent: ${absentRecords.length} users marked for session ${session.title}`);
        }

        if (session.status !== 'completed') {
          session.status = 'completed';
          await session.save();
        }
      }
    } catch (error) {
      console.error('Auto-absent error:', error.message);
    }
  });
};

module.exports = { scheduleAutoAbsent };
