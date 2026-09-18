const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'paper'], required: true }, 
  fileUrl: { type: String, required: true }, 
  subject: { type: String, required: true }, 
  
  // අලුතින් එකතු කල fields 
  grade: { type: String, required: true },
  description: { type: String, default: "" },

  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);