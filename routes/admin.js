const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const {addTeacher,getAllTeachers,getAllAdmins,deleteAdmin,deleteTeacher,getAllStudents,getNewStudentCount, clearSidebarBadge, clearStudentRowDot,
  deleteStudent, deleteAllStudents, getAdminProfile, updateAdminProfile} = require('../controllers/adminController');

  // Multer Configuration (profile_photos ෆෝල්ඩරයට save වීම සඳහා)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'profile_photos/');
  },
  filename: function (req, file, cb) {
    cb(null, 'admin-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/add-teacher', authMiddleware, addTeacher);
router.get('/teachers', getAllTeachers);
router.get('/admins', authMiddleware, getAllAdmins);
router.delete('/admins/:id', authMiddleware, deleteAdmin);
router.delete('/teachers/:id', authMiddleware, deleteTeacher);
router.get('/students', getAllStudents);
router.get('/students/new-count', authMiddleware, getNewStudentCount);
router.put('/students/clear-sidebar', authMiddleware, clearSidebarBadge);
router.put('/students/:id/clear-dot', authMiddleware, clearStudentRowDot);
router.delete('/students/:id', authMiddleware, deleteStudent);
router.delete('/students', authMiddleware, deleteAllStudents);

router.get('/profile', authMiddleware, getAdminProfile);
router.put('/profile', authMiddleware, upload.single('profilePhoto'), updateAdminProfile);

module.exports = router;