const express = require('express');
const router = express.Router();
const multer = require('multer'); // Multer import කරගන්න
const path = require('path');
const studentAuthMiddleware = require('../middleware/studentAuthMiddleware');

const { 
  registerStudent, 
  loginStudent, 
  googleAuthStudent,
  updateStudentProfile 
} = require('../controllers/studentAuthController');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Student_profile_photos/'); // පින්තූරය සේව් වන ෆෝල්ඩරය
  },
  filename: function (req, file, cb) {
    // අනන්‍ය නමක් සෑදීම (උදා: student-1691234567.jpg)
    cb(null, 'student-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes
router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/student/google', googleAuthStudent);

// Profile Update Route (upload.single('profileImage') එකතු කර ඇත)
router.put('/student/profile', studentAuthMiddleware, upload.single('profileImage'), updateStudentProfile);

module.exports = router;