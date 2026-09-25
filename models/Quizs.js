//models/Quiz.js

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['mcq', 'short', 'essay'], required: true },
  questionText: { type: String, required: true },
  imageUrl: { type: String },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true }, // රහස් පිළිතුර
  marks: { type: Number, required: true, default: 5 }
});

const quizSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // In minutes
  questions: [questionSchema],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" }, // Reason for rejection
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], // Added an array to store class IDs (similar to the one for materials).
  isPublished: { type: Boolean, default: false },
  // ---(New Quiz Tracking)---
  isNewForSidebar: { type: Boolean, default: true },
  isNewForTable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);