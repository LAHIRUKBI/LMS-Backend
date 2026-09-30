const mongoose = require('mongoose');

const freeCardRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  
  // Father Details
  fatherName: { type: String, default: "" },
  fatherOccupation: { type: String, default: "" },
  fatherPhone: { type: String, default: "" },
  
  // Mother Details
  motherName: { type: String, default: "" },
  motherOccupation: { type: String, default: "" },
  motherPhone: { type: String, default: "" },
  
  // Guardian Details
  hasGuardian: { type: Boolean, default: false },
  guardianName: { type: String, default: "" },
  guardianRelation: { type: String, default: "" },
  guardianPhone: { type: String, default: "" },
  
  familyBackground: { type: String, required: true },
  selectedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  files: [{ type: String }],
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('FreeCardRequest', freeCardRequestSchema);