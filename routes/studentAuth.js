const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const studentAuthMiddleware = require('../middleware/studentAuthMiddleware');

const { 
  registerStudent, 
  loginStudent, 
  googleAuthStudent,
  updateStudentProfile,
  logoutStudent,
  forceOfflineStudent 
} = require('../controllers/studentAuthController');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Student_profile_photos/'); // The folder where the image is saved
  },
  filename: function (req, file, cb) {
    // Creating a unique name (e.g., student-1691234567.jpg)
    cb(null, 'student-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes
router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/student/google', googleAuthStudent);
router.post('/student/logout', logoutStudent);
router.post('/student/force-offline', forceOfflineStudent);

// Profile Update Route (upload.single('profileImage') added)
router.put('/student/profile', studentAuthMiddleware, upload.single('profileImage'), updateStudentProfile);

module.exports = router;