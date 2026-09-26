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
  getNewQuizCount, clearQuizSidebarBadge, clearQuizCardDot,evaluateAllMCQQuizzes
} = require('../controllers/quizController');

// Automatically creating the 'Quize_images' folder if it does not exist.
const quizImgDir = path.join(__dirname, '../Quize_images');
if (!fs.existsSync(quizImgDir)) {
  fs.mkdirSync(quizImgDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Quize_images/');
  },
  filename: function (req, file, cb) {
    // Assigning a unique name to prevent the file name from changing.
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// `upload.any()` retrieves all images and data sent from the frontend at once.
router.post('/quizzes', authMiddleware, upload.any(), createQuiz);

router.get('/admin/quizzes', authMiddleware, getPendingQuizzes);
router.patch('/admin/quizzes/:id/status', authMiddleware, updateQuizStatus);
router.delete('/admin/quizzes/:id', authMiddleware, deleteQuizAdmin);
router.get('/my-quizzes', authMiddleware, getMyQuizzes);
router.put('/:id/publish', authMiddleware, publishQuiz);
router.delete('/:id', authMiddleware, deleteTeacherQuiz);

// New route for providing class-related quizzes
router.get('/class/:classId', authMiddleware, getQuizzesByClass);


// Student Submission & Evaluation Routes
router.post('/:id/submit', authMiddleware, submitQuiz);
router.get('/:id/submissions', authMiddleware, getQuizSubmissions);
router.post('/evaluate-essay', authMiddleware, evaluateEssay);

// Quiz Tracking Routes
router.get('/admin/new-count', authMiddleware, getNewQuizCount);
router.put('/admin/clear-sidebar', authMiddleware, clearQuizSidebarBadge);
router.put('/admin/:id/clear-dot', authMiddleware, clearQuizCardDot);

// This must always be placed at the very bottom (to avoid interfering with other routes due to `/:id`).
router.get('/:id', authMiddleware, getQuizById);
router.get('/:id/check-submission', authMiddleware, checkQuizSubmission);
router.post('/:id/evaluate-all-mcq', authMiddleware, evaluateAllMCQQuizzes);

module.exports = router;