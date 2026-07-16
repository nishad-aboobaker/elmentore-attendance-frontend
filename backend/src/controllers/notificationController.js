const User = require('../models/User');
const Notification = require('../models/Notification');
const webpush = require('../utils/push');

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
    const { title, body, userIds } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    // Get active target employees (regardless of push subscription)
    const query = { isActive: true, role: 'employee' };
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query._id = { $in: userIds };
    }

    const users = await User.find(query);
    
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
    const notificationDocs = [];

    users.forEach(user => {
      // Create DB notification document for EVERY active employee
      notificationDocs.push({
        userId: user._id,
        title,
        message: body,
        type: 'announcement',
        isRead: false
      });

      // Send push notification ONLY if they have subscriptions
      if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        user.pushSubscriptions.forEach(sub => {
          sendPromises.push(
            webpush.sendNotification(sub, payload).catch(err => {
              console.error('Failed to send push to endpoint:', sub.endpoint, err.message);
            })
          );
          sentCount++;
        });
      }
    });

    await Promise.allSettled(sendPromises);
    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    res.json({ message: `Custom notification blasted to ${sentCount} devices.` });
  } catch (err) {
    console.error('Custom notification error:', err);
    res.status(500).json({ message: 'Server error sending notification' });
  }
};

// Fetch last 20 notifications for the logged-in user
exports.getHistory = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === 'all') {
      await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    } else {
      await Notification.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        { isRead: true }
      );
    }
    
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
};
