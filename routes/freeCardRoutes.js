const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const studentAuthMiddleware = require('../middleware/studentAuthMiddleware');
const { submitFreeCardRequest, getFreeCardRequestByStudentId } = require('../controllers/freeCardController');

// Multer Storage Configuration with Auto-Folder Creation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'free_card_request/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'free-card-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Route for submitting free card request (Supports multiple files up to 10)
router.post('/student/free-card-request', studentAuthMiddleware, upload.array('files', 10), submitFreeCardRequest);
router.get('/student/request/:studentId', studentAuthMiddleware, getFreeCardRequestByStudentId);

module.exports = router;