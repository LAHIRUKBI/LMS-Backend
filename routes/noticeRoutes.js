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
  getStudentNotices,
  getTeacherNotices
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


router.get('/students-list', getStudentsList); // 1. Get Students List for Notice Selection
router.get('/teachers-list', getTeachersList); // 2. Get Teachers List for Notice Selection
router.get('/notices', getAllNotices); // 3. Get All Published Notices
router.delete('/notices/:id', deleteNotice); // 4. Delete a Notice by ID
router.post('/notices', upload.single('image'), createNotice); // 5. Create Notice with Image Support & Send Notifications to Target Audience
router.get('/student/notices', studentAuthMiddleware, getStudentNotices); // 6. Get Notices for a Specific Student
router.get('/teacher/notices/:id', getTeacherNotices);

module.exports = router;