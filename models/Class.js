const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  grade: { type: String, required: true }, // උදා: "Grade 10", "Grade 11" ආදී වශයෙන්
  medium: { type: String, enum: ['Sinhala Medium', 'English Medium'], required: true },
  mode: { type: String, enum: ['Online', 'Offline'], required: true },
  day: { type: String, required: true }, // උදා: Monday, Tuesday etc.
  startTime: { type: String, required: true }, // උදා: 08:00 AM
  endTime: { type: String, required: true },   // උදා: 10:00 AM
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);