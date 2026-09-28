const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const studentAuthMiddleware = require('../middleware/studentAuthMiddleware');
const {
  getStudentsList,
  getTeachersList,
  getAllNotices,
  deleteNotice,
  createNotice,
  getStudentNotices
} = require('../controllers/noticeController');

// Image Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 1. Get Students List for Notice Selection
router.get('/students-list', getStudentsList);

// 2. Get Teachers List for Notice Selection
router.get('/teachers-list', getTeachersList);

// 3. Get All Published Notices
router.get('/notices', getAllNotices);

// 4. Delete a Notice by ID
router.delete('/notices/:id', deleteNotice);

// 5. Create Notice with Image Support & Send Notifications to Target Audience
router.post('/notices', upload.single('image'), createNotice);

// 6. Get Notices for a Specific Student
router.get('/student/notices', studentAuthMiddleware, getStudentNotices);

module.exports = router;