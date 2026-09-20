const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

// Config files ඉම්පෝර්ට් කිරීම
const connectDB = require('./config/db');
const setupSocket = require('./config/socket');

// Routes ඉම්පෝර්ට් කිරීම
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const materialRoutes = require('./routes/material');
const teacherRoutes = require('./routes/teacher');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/profile_photos', express.static(path.join(__dirname, 'profile_photos')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);

// MongoDB Connection එක කැඳවීම
connectDB();

// Basic Test Route
app.get('/', (req, res) => {
  res.send('LMS Backend API is running...');
});

// HTTP server එක සෑදීම
const server = http.createServer(app);

// Socket.io Server එක Setup කිරීම
setupSocket(server, app);

// Server Start කිරීම (මෙහිදී app.listen වෙනුවට server.listen භාවිතා කිරීම වැදගත් වේ)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});