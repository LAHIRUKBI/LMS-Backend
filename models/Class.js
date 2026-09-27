const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  grade: { type: String, required: true }, // e.g., "Grade 10", "Grade 11", etc.
  medium: { type: String, enum: ['Sinhala Medium', 'English Medium'], required: true },
  mode: { type: String, enum: ['Online', 'Offline'], required: true },
  day: { type: String, required: true }, // උදා: Monday, Tuesday etc.
  startTime: { type: String, required: true }, // උදා: 08:00 AM
  endTime: { type: String, required: true },   // උදා: 10:00 AM
  coverImage: { type: String, default: "" }, // Optional cover photo
  description: { type: String, default: "" }  // Optional description
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);