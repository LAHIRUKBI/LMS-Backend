const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const adminRoutes = require('./routes/admin');
const materialRoutes = require('./routes/material');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- මෙන්න මේ පේළි දෙක අලුතින් එකතු කරන්න ---
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/teacher', require('./routes/teacher'));
app.use('/profile_photos', express.static(path.join(__dirname, 'profile_photos')));
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);

//

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    createDefaultAdmin(); // Database සම්බන්ධ වූ පසු Default Admin චෙක් කිරීම
  })
  .catch((err) => console.log('❌ MongoDB Connection Error: ', err));

// Default Admin නිර්මාණය කිරීමේ Function එක
const createDefaultAdmin = async () => {
  try {
    // 'admin' කියන ID එකෙන් දැනටමත් කෙනෙක් ඉන්නවද බලනවා
    const adminExists = await Admin.findOne({ adminId: 'admin' });
    
    if (!adminExists) {
      // Password එක Hash කිරීම (ආරක්ෂාව සඳහා)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('1234', salt);

      const defaultAdmin = new Admin({
        adminId: 'admin',
        name: 'Super Admin',
        email: 'admin@lms.com',
        password: hashedPassword,
        isDefault: true
      });

      await defaultAdmin.save();
      console.log('✅ Default Admin නිර්මාණය කළා! (ID: admin, Password: 1234)');
    } else {
      console.log('⚡ Default Admin දැනටමත් පද්ධතියේ සිටී.');
    }
  } catch (error) {
    console.log('❌ Default Admin සෑදීමේදී දෝෂයක්: ', error);
  }
};

// Basic Test Route
app.get('/', (req, res) => {
  res.send('LMS Backend API is running...');
});

// Server Start කිරීම
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});



// HTTP server එක සෑදීම
const server = http.createServer(app);

// Socket.io Server එක සෑදීම
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // ඔබගේ Frontend URL එක
    methods: ["GET", "POST"]
  }
});

// Socket connection එක හැසිරවීම
// server.js හි Socket connection හැසිරවීමේ කොටස
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // ගුරුවරයා තමන්ගේ ID එකෙන් Room එකකට Join වීම
  socket.on("join_user_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // 👇 අලුතින් එක් කළ කොටස: Admin වරුන් Admin Room එකට Join වීම
  socket.on("join_admin_room", () => {
    socket.join("admin_room");
    console.log("An Admin joined the admin_room");
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Routes වලට (ticketRoutes.js) Socket.io instance එක ලබා දීම
app.set("io", io);
