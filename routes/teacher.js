const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');

const {getTeacherProfile,updateTeacherProfile} = require('../controllers/teacherController');

// ඡායාරූප සේව් වන Folder එක සෑදීම (නොමැති නම්)
const uploadDir = 'profile_photos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Configuration (Unique ID එකක් සමඟ ෆොටෝ එක සේව් කිරීම)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir + '/');
  },
  filename: function (req, file, cb) {
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueId + path.extname(file.originalname)); // උදා: 1691234567-12345.jpg
  }
});
const upload = multer({ storage: storage });

// Routes නිර්මාණය කිරීම
router.get('/profile', authMiddleware, getTeacherProfile);
router.put('/profile', authMiddleware, upload.single('profilePhoto'), updateTeacherProfile);

module.exports = router;