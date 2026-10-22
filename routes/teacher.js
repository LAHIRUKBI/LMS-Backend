const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const { getTeacherProfile, updateTeacherProfile } = require('../controllers/teacherController');

// Routes
router.get('/profile', authMiddleware, getTeacherProfile);
router.put('/profile', authMiddleware, upload.single('profilePhoto'), updateTeacherProfile);

module.exports = router;