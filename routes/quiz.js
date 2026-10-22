const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

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

// Quizzes සෑදීම (Cloudinary upload.any() භාවිතා කරමින්)
router.post('/quizzes', authMiddleware, upload.any(), createQuiz);
router.get('/admin/quizzes', authMiddleware, getPendingQuizzes);
router.patch('/admin/quizzes/:id/status', authMiddleware, updateQuizStatus);
router.delete('/admin/quizzes/:id', authMiddleware, deleteQuizAdmin);
router.get('/my-quizzes', authMiddleware, getMyQuizzes);
router.put('/:id/publish', authMiddleware, publishQuiz);
router.delete('/:id', authMiddleware, deleteTeacherQuiz);

router.get('/class/:classId', authMiddleware, getQuizzesByClass);

// Student Submission & Evaluation Routes
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