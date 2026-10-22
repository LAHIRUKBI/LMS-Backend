// models/QuizSubmission.js

const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  // By using 'Mixed', you can safely store Strings, Arrays (for MCQs), or Objects (for essay sub-questions).
  answers: { type: mongoose.Schema.Types.Mixed, default: {} }, 
  answerSheets: { type: mongoose.Schema.Types.Mixed, default: {} },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  essayMarks: { type: mongoose.Schema.Types.Mixed, default: {} }, // questionId -> marks given by teacher
  teacherCorrections: { type: mongoose.Schema.Types.Mixed, default: {} },
  evaluatedPdfUrl: { type: String, default: "" },
  evaluatedPdfPublicId: { type: String, default: "" },
  isEvaluated: { type: Boolean, default: false },
  isSentToStudent: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: String, default: "" } 
}, { timestamps: true });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);