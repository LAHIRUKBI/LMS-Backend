// routes/quiz.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { 
  createQuiz, 
  getPendingQuizzes, 
  updateQuizStatus, 
  deleteQuizAdmin,
  getMyQuizzes, 
  publishQuiz,
  deleteTeacherQuiz,
  getQuizzesByClass,
  getQuizById,
  submitQuiz,
  getQuizSubmissions,
  evaluateEssay,
  checkQuizSubmission,
  getNewQuizCount, clearQuizSidebarBadge, clearQuizCardDot, evaluateAllMCQQuizzes, deleteQuizSubmission, sendSubmissionToStudent, getStudentQuizResults, sendAllSubmissionsToStudents
} = require('../controllers/quizController');

// 1. Quize_images ෆෝල්ඩරය
const quizImgDir = path.join(__dirname, '../Quize_images');
if (!fs.existsSync(quizImgDir)) {
  fs.mkdirSync(quizImgDir);
}

// 2. Answer_sheet ෆෝල්ඩරය ස්වයංක්‍රීයව සෑදීම
const answerSheetDir = path.join(__dirname, '../Answer_sheet');
if (!fs.existsSync(answerSheetDir)) {
  fs.mkdirSync(answerSheetDir);
}

// Answer_PDF ෆෝල්ඩරය ස්වයංක්‍රීයව සෑදීම
const answerPdfDir = path.join(__dirname, '../Answer_PDF');
if (!fs.existsSync(answerPdfDir)) {
  fs.mkdirSync(answerPdfDir);
}

// Multer Storage Configuration for Quizzes & Answer Sheets
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname.startsWith('answerSheets_')) {
      cb(null, 'Answer_sheet/');
    } else {
      cb(null, 'Quize_images/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

router.post('/quizzes', authMiddleware, upload.any(), createQuiz);
router.get('/admin/quizzes', authMiddleware, getPendingQuizzes);
router.patch('/admin/quizzes/:id/status', authMiddleware, updateQuizStatus);
router.delete('/admin/quizzes/:id', authMiddleware, deleteQuizAdmin);
router.get('/my-quizzes', authMiddleware, getMyQuizzes);
router.put('/:id/publish', authMiddleware, publishQuiz);
router.delete('/:id', authMiddleware, deleteTeacherQuiz);

router.get('/class/:classId', authMiddleware, getQuizzesByClass);

// Student Submission & Evaluation Routes (upload.any() භාවිතා කරමින් පිළිතුරු කොළ ෆයිල්ස් ලබාගැනීම)
router.post('/:id/submit', authMiddleware, upload.any(), submitQuiz);
router.get('/:id/submissions', authMiddleware, getQuizSubmissions);
router.post('/evaluate-essay', authMiddleware, evaluateEssay);
router.delete('/submission/:id', authMiddleware, deleteQuizSubmission);
router.put('/submission/:id/send', authMiddleware, sendSubmissionToStudent);
router.get('/student/my-results', authMiddleware, getStudentQuizResults);
router.put('/:quizId/send-all', authMiddleware, sendAllSubmissionsToStudents);

// Quiz Tracking Routes
router.get('/admin/new-count', authMiddleware, getNewQuizCount);
router.put('/admin/clear-sidebar', authMiddleware, clearQuizSidebarBadge);
router.put('/admin/:id/clear-dot', authMiddleware, clearQuizCardDot);

// This must always be placed at the very bottom (to avoid interfering with other routes due to `/:id`).
router.get('/:id', authMiddleware, getQuizById);
router.get('/:id/check-submission', authMiddleware, checkQuizSubmission);
router.post('/:id/evaluate-all-mcq', authMiddleware, evaluateAllMCQQuizzes);

module.exports = router;