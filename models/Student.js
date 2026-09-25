const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String }, 
  address: { type: String },
  grade: { type: String },   
  school: { type: String },  
  profileImage: { type: String, default: "" },
  country: { type: String, default: "" },
  timeZone: { type: String, default: "" },
  medium: { type: String, default: "" },
  parentName: { type: String, default: "" },
  parentPhone: { type: String, default: "" },
  // (New Student Tracking)
  isNewForSidebar: { type: Boolean, default: true },
  isNewForTable: { type: Boolean, default: true },
  password: { type: String }, 
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);