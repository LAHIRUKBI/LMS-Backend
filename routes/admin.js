const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Controller ගොනුවෙන් functions ඉම්පෝර්ට් කරගැනීම
const {addTeacher,getAllTeachers,getAllAdmins,deleteAdmin,deleteTeacher} = require('../controllers/adminController');

// Routes නිර්මාණය කිරීම
router.post('/add-teacher', authMiddleware, addTeacher);
router.get('/teachers', authMiddleware, getAllTeachers);
router.get('/admins', authMiddleware, getAllAdmins);
router.delete('/admins/:id', authMiddleware, deleteAdmin);
router.delete('/teachers/:id', authMiddleware, deleteTeacher);

module.exports = router;