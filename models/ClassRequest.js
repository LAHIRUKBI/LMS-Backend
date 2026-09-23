//models/ClassRequest.js

const mongoose = require('mongoose');

const classRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Blocked'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('ClassRequest', classRequestSchema);