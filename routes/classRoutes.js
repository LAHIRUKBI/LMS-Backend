const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // ගුරුවරයාගේ Token එක පරීක්ෂා කරන Middleware එක

const { createClass, getTeacherClasses, deleteClass, getAllClassesForAdmin, requestClass, getStudentRequests, getAllClassRequests, updateRequestStatus , deleteClassRequest } = require('../controllers/classController');

router.post('/create', authMiddleware, createClass);
router.get('/my-classes', authMiddleware, getTeacherClasses);
router.delete('/:id', authMiddleware, deleteClass);

// Admin සහ Student සඳහා සියලුම පන්ති ලබාගැනීමේ route එක
router.get('/all', authMiddleware, getAllClassesForAdmin);

router.post('/request', authMiddleware, requestClass);
router.get('/student-requests', authMiddleware, getStudentRequests);
router.get('/requests/all', authMiddleware, getAllClassRequests);
router.put('/requests/status', authMiddleware, updateRequestStatus);
// සිසුන්ගේ පන්ති ඉල්ලීම සම්පූර්ණයෙන්ම ඉවත් කිරීමට (Delete) අලුතින් එකතු කළ Route එක
router.delete('/requests/:id', authMiddleware, deleteClassRequest);

module.exports = router;