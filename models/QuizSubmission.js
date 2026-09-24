// models/QuizSubmission.js

const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  answers: { type: Map, of: String }, // questionId -> answer
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  essayMarks: { type: Map, of: Number, default: {} }, // questionId -> marks given by teacher
  isEvaluated: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: String, default: "" } // උදා: "දෙන ලද වෙලාවට වඩා විනාඩි 4 කට කලින්"
}, { timestamps: true });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);