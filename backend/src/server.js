require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { scheduleAutoAbsent } = require('./services/autoAbsent');
const { scheduleNotifications } = require('./services/notifications');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const attendanceRoutes = require('./routes/attendance');
const userRoutes = require('./routes/user');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const { initSocket } = require('./utils/socket');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  scheduleAutoAbsent();
  scheduleNotifications();
  
  // Initialize WebSocket server
  initSocket(server);
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
