const express = require('express');
const router = express.Router();
const studentAuthMiddleware = require('../middleware/studentAuthMiddleware');
const { upload } = require('../config/cloudinary');

const { 
  registerStudent, 
  loginStudent, 
  googleAuthStudent,
  updateStudentProfile,
  logoutStudent,
  forceOfflineStudent 
} = require('../controllers/studentAuthController');

// Routes
router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/student/google', googleAuthStudent);
router.post('/student/logout', logoutStudent);
router.post('/student/force-offline', forceOfflineStudent);

// Cloudinary upload.single('profileImage') එකතු කර ඇත
router.put('/student/profile', studentAuthMiddleware, upload.single('profileImage'), updateStudentProfile);

module.exports = router;