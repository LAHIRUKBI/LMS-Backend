const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'paper'], required: true }, // පාඩමේ වර්ගය
  fileUrl: { type: String, required: true }, // File එක තියෙන තැන (URL)
  subject: { type: String, required: true }, // විෂය
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }, // අප්ලෝඩ් කළ ගුරුවරයා
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);