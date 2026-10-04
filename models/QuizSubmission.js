// models/QuizSubmission.js

const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  // Mixed භාවිතා කිරීම මඟින් String, Array (MCQ සඳහා), හෝ Object (Essay sub-questions සඳහා) සියල්ල ආරක්ෂිතව ගබඩා කරගත හැක
  answers: { type: mongoose.Schema.Types.Mixed, default: {} }, 
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  essayMarks: { type: mongoose.Schema.Types.Mixed, default: {} }, // questionId -> marks given by teacher
  isEvaluated: { type: Boolean, default: false },
  isSentToStudent: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: String, default: "" } 
}, { timestamps: true });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);