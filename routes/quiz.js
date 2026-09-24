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
  getQuizById
} = require('../controllers/quizController');

// Quize_images ෆෝල්ඩරය නැත්නම් එය ස්වයංක්‍රීයව සෑදීම
const quizImgDir = path.join(__dirname, '../Quize_images');
if (!fs.existsSync(quizImgDir)) {
  fs.mkdirSync(quizImgDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Quize_images/'); // පින්තූර සේව් වන ෆෝල්ඩරය
  },
  filename: function (req, file, cb) {
    // ෆයිල් එකේ නම වෙනස් වීම වැළැක්වීමට අද්විතීය නමක් ලබා දීම
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB සීමාව
});

// upload.any() මඟින් frontend එකෙන් එවන සියලුම images සහ data එකවර ලබා ගනී
router.post('/quizzes', authMiddleware, upload.any(), createQuiz);

router.get('/admin/quizzes', authMiddleware, getPendingQuizzes);
router.patch('/admin/quizzes/:id/status', authMiddleware, updateQuizStatus);
router.delete('/admin/quizzes/:id', authMiddleware, deleteQuizAdmin);
router.get('/my-quizzes', authMiddleware, getMyQuizzes);
router.put('/:id/publish', authMiddleware, publishQuiz);
router.delete('/:id', authMiddleware, deleteTeacherQuiz);

// පන්තිවලට අදාළව Quiz ලබා දීමේ අලුත් Route එක
router.get('/class/:classId', authMiddleware, getQuizzesByClass);
// නිශ්චිත Quiz එකක් ලබා ගැනීමේ route එක
router.get('/:id', authMiddleware, getQuizById);

module.exports = router;