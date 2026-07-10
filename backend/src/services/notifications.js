const cron = require('node-cron');
const WorkingDay = require('../models/WorkingDay');
const User = require('../models/User');
const webpush = require('web-push');

const scheduleNotifications = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Calculate time 10 minutes from now (with a 1-minute buffer)
      const tenMinsFromNow = new Date(now.getTime() + 10 * 60000);
      
      const targetTimeStr = `${String(tenMinsFromNow.getHours()).padStart(2, '0')}:${String(tenMinsFromNow.getMinutes()).padStart(2, '0')}`;
      
      // Find upcoming sessions scheduled for today, matching the start time, where we haven't sent reminders yet
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const sessions = await WorkingDay.find({
        status: 'upcoming',
        date: { $gte: startOfDay, $lte: endOfDay },
        startTime: targetTimeStr,
        remindersSent: false
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
        let count = 0;
        
        users.forEach(user => {
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
