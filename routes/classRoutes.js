const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const { createClass, getTeacherClasses, deleteClass, getAllClassesForAdmin, requestClass, getStudentRequests, getAllClassRequests, updateRequestStatus , deleteClassRequest, adminUpdateClass,
  updateTeacherClass, approveAllClassRequestsForClass, blockAllClassRequestsForClass } = require('../controllers/classController');


router.post('/create', authMiddleware, upload.single('coverImage'), createClass);
router.get('/my-classes', authMiddleware, getTeacherClasses);
router.put('/teacher/update/:id', authMiddleware, upload.single('coverImage'), updateTeacherClass);
router.delete('/:id', authMiddleware, deleteClass);

// The route to access all classes for Admins and Students.
router.get('/all', getAllClassesForAdmin);

router.post('/request', authMiddleware, requestClass);
router.get('/student-requests', authMiddleware, getStudentRequests);
router.get('/requests/all', authMiddleware, getAllClassRequests);
router.put('/requests/status', authMiddleware, updateRequestStatus);
router.put('/requests/approve-all', authMiddleware, approveAllClassRequestsForClass);
router.put('/requests/block-all', authMiddleware, blockAllClassRequestsForClass);
// The newly added route to completely remove (delete) students' class requests.
router.delete('/requests/:id', authMiddleware, deleteClassRequest);
router.put('/admin/update/:id', authMiddleware, upload.single('coverImage'), adminUpdateClass);

module.exports = router;