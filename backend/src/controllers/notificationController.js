const User = require('../models/User');
const webpush = require('web-push');

// Initialize Web Push with VAPID keys
if (process.env.PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@elmentore.com',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
  );
}

// Subscribe user to push notifications
exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ message: 'Missing subscription object' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add subscription if it doesn't already exist
    const subExists = user.pushSubscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );

    if (!subExists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(200).json({ message: 'Successfully subscribed to push notifications' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ message: 'Server error saving subscription' });
  }
};

// Send custom notification (Admin only)
exports.sendCustom = async (req, res) => {
  try {
    const { title, body } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    // Get all active employees who have push subscriptions
    const users = await User.find({ isActive: true, 'pushSubscriptions.0': { $exists: true } });
    
    let sentCount = 0;
    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/assets/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
          url: '/'
        }
      }
    });

    // Loop through users and their subscriptions
    const sendPromises = [];
    users.forEach(user => {
      user.pushSubscriptions.forEach(sub => {
        sendPromises.push(
          webpush.sendNotification(sub, payload).catch(err => {
            console.error('Failed to send push to endpoint:', sub.endpoint, err.message);
          })
        );
        sentCount++;
      });
    });

    await Promise.allSettled(sendPromises);

    res.json({ message: `Custom notification blasted to ${sentCount} devices.` });
  } catch (err) {
    console.error('Custom notification error:', err);
    res.status(500).json({ message: 'Server error sending notification' });
  }
};
