const cron = require('node-cron');
const WorkingDay = require('../models/WorkingDay');
const User = require('../models/User');
const Notification = require('../models/Notification');
const webpush = require('web-push');
const { getISTDate } = require('../utils/timezone');

const scheduleNotifications = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const nowIST = getISTDate();
      // Calculate time 10 minutes from now (with a 1-minute buffer)
      const tenMinsFromNow = new Date(nowIST.getTime() + 10 * 60000);
      
      const targetTimeStr = `${String(tenMinsFromNow.getUTCHours()).padStart(2, '0')}:${String(tenMinsFromNow.getUTCMinutes()).padStart(2, '0')}`;
      
      // Find upcoming sessions scheduled for today, matching the start time, where we haven't sent reminders yet
      const startOfDay = new Date(nowIST);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(nowIST);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Since DB date is stored as UTC (e.g., July 12 18:30 for July 13 IST),
      // we can just adjust startOfDay to account for the -5.5 hours.
      const adjustedStart = new Date(startOfDay.getTime() - (5.5 * 3600000));
      const adjustedEnd = new Date(endOfDay.getTime() - (5.5 * 3600000));

      const sessions = await WorkingDay.find({
        status: 'upcoming',
        date: { $gte: adjustedStart, $lte: adjustedEnd },
        startTime: targetTimeStr,
        reminderSent: { $ne: true }
      });

      for (const session of sessions) {
        // Find users to notify (employees with subscriptions)
        const users = await User.find({ isActive: true, role: 'employee', 'pushSubscriptions.0': { $exists: true } });
        
        const payload = JSON.stringify({
          notification: {
            title: 'Upcoming Session Reminder',
            body: `Session '${session.title}' starts in 10 minutes. Get ready!`,
            icon: '/assets/icons/icon-192x192.png',
            vibrate: [100, 50, 100],
            data: { url: '/' }
          }
        });

        const sendPromises = [];
        const notificationDocs = [];
        let count = 0;
        
        users.forEach(user => {
          notificationDocs.push({
            userId: user._id,
            title: 'Upcoming Session Reminder',
            message: `Session '${session.title}' starts in 10 minutes. Get ready!`,
            type: 'reminder',
            isRead: false
          });

          user.pushSubscriptions.forEach(sub => {
            sendPromises.push(
              webpush.sendNotification(sub, payload).catch(err => {
                console.error('Failed to send push to endpoint:', sub.endpoint, err.message);
              })
            );
            count++;
          });
        });

        await Promise.allSettled(sendPromises);
        if (notificationDocs.length > 0) {
          await Notification.insertMany(notificationDocs);
        }

        console.log(`Sent 10-min reminder for session ${session.title} to ${count} devices.`);

        // Mark as sent
        session.remindersSent = true;
        await session.save();
      }
    } catch (error) {
      console.error('Notification cron error:', error.message);
    }
  });
};

module.exports = { scheduleNotifications };
