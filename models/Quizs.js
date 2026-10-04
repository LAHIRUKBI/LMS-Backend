const mongoose = require('mongoose');

// 1. Essay ප්‍රශ්න සඳහා අනු අංක යටතේ (Sub-questions) දත්ත ගබඩා කිරීමේ Schema එක
const subQuestionSchema = new mongoose.Schema({
  subQuestionText: { type: String, required: true },
  marks: { type: Number, required: true, default: 5 }
});

const questionSchema = new mongoose.Schema({
  // 'single' සහ 'essay' වර්ග අලුතින් එකතු කරන ලදී (පවතින mcq, short ඉවත් කර නැත)
  type: { type: String, enum: ['mcq', 'single', 'short', 'essay'], required: true },
  questionText: { type: String, required: true },
  imageUrl: { type: String },
  options: [{ type: String }],
  // Multiple Choice සඳහා array එකක් හෝ Single/Short සඳහා string එකක් ලෙස ගබඩා කළ හැකි වන සේ Mixed භාවිතා කරන ලදී
  correctAnswer: { type: mongoose.Schema.Types.Mixed }, 
  marks: { type: Number, required: true, default: 3 },
  subQuestions: [subQuestionSchema] // Essay ප්‍රශ්න සඳහා අනු ප්‍රශ්න (Sub-questions) ලැයිස්තුව
});

// නව Class Schedule Schema එක (පවතින පරිදිම ඇත)
const classScheduleSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  publishType: { type: String, enum: ['now', 'schedule'], default: 'now' },
  startDate: { type: Date }, // යම් දිනක සිට
  startTime: { type: String }, // වේලාව (උදා: 08:00)
  endDate: { type: Date }, // මේ දිනය දක්වා
  endTime: { type: String }
});

const quizSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // In minutes
  questions: [questionSchema],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" }, // Reason for rejection
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], 
  classSchedules: [classScheduleSchema], // නව scheduled විස්තර සදහා
  isPublished: { type: Boolean, default: false },
  // ---(New Quiz Tracking)---
  isNewForSidebar: { type: Boolean, default: true },
  isNewForTable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);