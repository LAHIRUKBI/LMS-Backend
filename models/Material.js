// models/Material.js
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'paper'], required: true }, 
  fileUrl: { type: String, required: true },
  coverImage: { type: String, default: "" }, 
  subject: { type: String, required: true }, 
  grade: { type: String, required: true },
  description: { type: String, default: "" },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" },
  // An array to store class IDs (Published classes)
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  isPublished: { type: Boolean, default: false },
  // Material Tracking
  isNewForSidebar: { type: Boolean, default: true },
  isNewForTable: { type: Boolean, default: true } 
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);