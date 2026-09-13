const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'paper'], required: true }, 
  fileUrl: { type: String, required: true }, 
  subject: { type: String, required: true }, 
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  // අලුතින් එකතු කළ කොටස් (Approval System සඳහා)
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);