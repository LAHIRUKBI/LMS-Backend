const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  createQuiz, 
  getPendingQuizzes, 
  updateQuizStatus, 
  deleteQuizAdmin,
  getMyQuizzes, 
  publishQuiz,
  deleteTeacherQuiz
} = require('../controllers/quizController');

// ගුරුවරයා Quiz එකක් post කිරීම සඳහා
router.post('/quizzes', authMiddleware, createQuiz);

// ඇඩ්මින් සියලුම quizzes බැලීම සඳහා
router.get('/admin/quizzes', authMiddleware, getPendingQuizzes);

// ඇඩ්මින් status එක (approved/rejected) වෙනස් කිරීම සඳහා (හේතුව සමඟ)
router.patch('/admin/quizzes/:id/status', authMiddleware, updateQuizStatus);

// ඇඩ්මින් විසින් quiz එකක් මකා දැමීම සඳහා
router.delete('/admin/quizzes/:id', authMiddleware, deleteQuizAdmin);

// ගුරුවරයා තමන් සෑදූ quizzes බැලීම සඳහා
router.get('/my-quizzes', authMiddleware, getMyQuizzes);

// ගුරුවරයා විසින් quiz එක publish කිරීම සඳහා
router.put('/:id/publish', authMiddleware, publishQuiz);

// ගුරුවරයාට තමන්ගේ quiz එකක් මැකීමට
router.delete('/:id', authMiddleware, deleteTeacherQuiz);

module.exports = router;