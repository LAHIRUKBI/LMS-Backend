const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const createDefaultAdmin = async () => {
  try {
    const defaultAdminId = process.env.SUPER_ADMIN_ID || 'admin';
    const adminExists = await Admin.findOne({ adminId: defaultAdminId });

    if (!adminExists) {
      const plainPassword = process.env.SUPER_ADMIN_PASSWORD;
      if (!plainPassword) {
        console.log('❌ Error: SUPER_ADMIN_PASSWORD is not defined in the .env file!');
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      const defaultAdmin = new Admin({
        adminId: defaultAdminId,
        name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@lms.com',
        password: hashedPassword,
        isDefault: true
      });

      await defaultAdmin.save();
      console.log(`✅ Default Admin created successfully`);
    } else {
      console.log('✅ The default admin already exists in the system.');
    }
  } catch (error) {
    console.log('❌ Error while creating the default admin: ', error);
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