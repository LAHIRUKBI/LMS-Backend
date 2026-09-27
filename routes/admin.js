const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {addTeacher,getAllTeachers,getAllAdmins,deleteAdmin,deleteTeacher,getAllStudents,getNewStudentCount, clearSidebarBadge, clearStudentRowDot,
  deleteStudent, deleteAllStudents} = require('../controllers/adminController');

router.post('/add-teacher', authMiddleware, addTeacher);
router.get('/teachers', authMiddleware, getAllTeachers);
router.get('/admins', authMiddleware, getAllAdmins);
router.delete('/admins/:id', authMiddleware, deleteAdmin);
router.delete('/teachers/:id', authMiddleware, deleteTeacher);
router.get('/students', getAllStudents);
router.get('/students/new-count', authMiddleware, getNewStudentCount);
router.put('/students/clear-sidebar', authMiddleware, clearSidebarBadge);
router.put('/students/:id/clear-dot', authMiddleware, clearStudentRowDot);
router.delete('/students/:id', authMiddleware, deleteStudent);
router.delete('/students', authMiddleware, deleteAllStudents);

module.exports = router;