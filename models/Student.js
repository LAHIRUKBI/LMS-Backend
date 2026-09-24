const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String }, 
  address: { type: String },
  grade: { type: String },   
  school: { type: String },  
  profileImage: { type: String, default: "" }, 
  // --- අලුතින් එකතු කළ ක්ෂේත්‍ර ---
  country: { type: String, default: "" },
  timeZone: { type: String, default: "" },
  medium: { type: String, default: "" },
  parentName: { type: String, default: "" },
  parentPhone: { type: String, default: "" },
  // ------------------------------
  password: { type: String }, 
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);