const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ adminId: 'admin' });
    if (!adminExists) {
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
      console.log('✅ Default Admin created : (ID: admin, Password: 1234)');
    } else {
      console.log('✅ The default admin already exists in the system.');
    }
  } catch (error) {
    console.log('❌ Default Admin සෑදීමේදී දෝෂයක්: ', error);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully');
    await createDefaultAdmin(); 
  } catch (err) {
    console.log('❌ MongoDB Connection Error: ', err);
    process.exit(1);
  }
};

module.exports = connectDB;