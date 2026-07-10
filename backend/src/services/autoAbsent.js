const cron = require('node-cron');
const WorkingDay = require('../models/WorkingDay');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const webpush = require('web-push');

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

        const activeUsers = await User.find({ isActive: true, role: 'employee' });
        const userIds = activeUsers.map(u => u._id);

        const existingRecords = await Attendance.find({ sessionId: session._id }).select('userId');
        const existingUserIds = existingRecords.map(r => r.userId.toString());

        const absentUsers = activeUsers.filter(u => !existingUserIds.includes(u._id.toString()));
        const absentRecords = absentUsers.map(u => ({
          sessionId: session._id,
          userId: u._id,
          status: 'absent',
          isManualEntry: false
        }));

        if (absentRecords.length > 0) {
          await Attendance.insertMany(absentRecords);
          
          // Send push notifications and save to Notification history
          const notificationDocs = [];
          const sendPromises = [];
          
          const payload = JSON.stringify({
            notification: {
              title: 'Attendance marked as Absent',
              body: `You were marked absent for session '${session.title}' because you did not check in.`,
              icon: '/assets/icons/icon-192x192.png',
              vibrate: [200, 100, 200],
              data: { url: '/' }
            }
          });

          absentUsers.forEach(user => {
            notificationDocs.push({
              userId: user._id,
              title: 'Attendance marked as Absent',
              message: `You were marked absent for session '${session.title}' because you did not check in.`,
              type: 'absent',
              isRead: false
            });

            if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
              user.pushSubscriptions.forEach(sub => {
                sendPromises.push(
                  webpush.sendNotification(sub, payload).catch(err => {
                    console.error('Failed to send absent push to endpoint:', sub.endpoint, err.message);
                  })
                );
              });
            }
          });

          await Promise.allSettled(sendPromises);
          if (notificationDocs.length > 0) {
            await Notification.insertMany(notificationDocs);
          }

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
