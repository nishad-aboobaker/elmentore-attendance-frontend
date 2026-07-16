const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupMessage = require('../models/GroupMessage');

let io;

exports.initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // Allow all origins for the angular app
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) return next(new Error('User not found or inactive'));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected to chat: ${socket.user.name}`);

    // Join the global room
    socket.join('global_chat');

    socket.on('sendGroupMessage', async (data, callback) => {
      try {
        if (!data.content || !data.content.trim()) return;

        // Save to DB
        const message = new GroupMessage({
          sender: socket.user._id,
          content: data.content.trim()
        });
        await message.save();

        // Populate sender details before broadcasting
        await message.populate('sender', 'name _id role department');

        // Broadcast to all connected clients in the global room
        io.to('global_chat').emit('receiveGroupMessage', message);

        if (callback) callback({ status: 'ok' });
      } catch (err) {
        console.error('Socket message error:', err);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from chat: ${socket.user.name}`);
    });
  });

  return io;
};

exports.getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
