const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const cron = require('node-cron');
const Notification = require('./models/Notification');
const NotificationSettings = require('./models/NotificationSettings');
// Importing config files
const connectDB = require('./config/db');
const setupSocket = require('./config/socket');

// Importing Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const materialRoutes = require('./routes/material');
const teacherRoutes = require('./routes/teacher');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const quizRoutes = require('./routes/quiz');
const classRoutes = require('./routes/classRoutes');
const adRoutes = require('./routes/adRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const faqRoutes = require('./routes/faqRoutes');

const studentAuthRoutes = require('./routes/studentAuth');
const freeCardRoutes = require('./routes/freeCardRoutes');

require('dotenv').config();

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/profile_photos', express.static(path.join(__dirname, 'profile_photos')));
app.use('/PDF_covers', express.static(path.join(__dirname, 'PDF_covers')));
app.use('/Quize_images', express.static(path.join(__dirname, 'Quize_images')));
app.use('/advertisement', express.static(path.join(__dirname, 'advertisement')));
app.use('/swp', express.static(path.join(__dirname, 'swp')));
app.use('/Class_Cover_images', express.static(path.join(__dirname, 'Class_Cover_images')));
app.use('/free_card_request', express.static(path.join(__dirname, 'free_card_request')));
app.use('/All_images', express.static(path.join(__dirname, 'All_images')));

// LMS System API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', noticeRoutes);
app.use('/api/faqs', faqRoutes);

// Student webaplication API routes
app.use('/api/auth', studentAuthRoutes);
app.use('/Student_profile_photos', express.static(path.join(__dirname, 'Student_profile_photos')));
app.use('/api/free-card', freeCardRoutes);

// Auto-delete Cron Job (Activates at 12:00 midnight every day)
cron.schedule('0 0 * * *', async () => {
  try {
    const settings = await NotificationSettings.findOne();
    if (settings && settings.autoDeleteDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.autoDeleteDays);

      const result = await Notification.deleteMany({ createdAt: { $lt: cutoffDate } });
      if (result.deletedCount > 0) {
        console.log(`Auto-deleted ${result.deletedCount} old notifications.`);
      }
    }
  } catch (err) {
    console.error('Error in auto-delete cron job:', err);
  }
});


// Invoking the MongoDB connection
connectDB();

// Basic Test Route
app.get('/', (req, res) => {
  res.send('LMS Backend API is running...');
});

// Creating the HTTP server
const server = http.createServer(app);

// Setting up the Socket.io Server
setupSocket(server, app);

// Starting the server (it is important to use `server.listen` instead of `app.listen` here).
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});