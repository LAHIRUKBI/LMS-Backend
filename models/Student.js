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
  
  // Father, Mother, Guardian Fields (Legacy parentName & parentPhone ඉවත් කර ඇත)
  fatherName: { type: String, default: "" },
  fatherOccupation: { type: String, default: "" },
  fatherPhone: { type: String, default: "" },
  motherName: { type: String, default: "" },
  motherOccupation: { type: String, default: "" },
  motherPhone: { type: String, default: "" },
  hasGuardian: { type: Boolean, default: false },
  guardianName: { type: String, default: "" },
  guardianRelation: { type: String, default: "" },
  guardianPhone: { type: String, default: "" },
  isOnline: { type: Boolean, default: false },

  isNewForSidebar: { type: Boolean, default: true },
  isNewForTable: { type: Boolean, default: true },
  password: { type: String }, 
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);