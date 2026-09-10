const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const adminRoutes = require('./routes/admin');
const materialRoutes = require('./routes/material');
const path = require('path');

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