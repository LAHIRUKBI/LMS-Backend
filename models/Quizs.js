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
  duration: { type: Number, required: true }, // විනාඩි වලින්
  questions: [questionSchema],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" }, // ප්‍රතික්ෂේප වීමට හේතුව
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], // පන්ති IDs ගබඩා කිරීම සඳහා Array එකක් (Materials වල මෙන්) අලුතින් එක් කළා
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);