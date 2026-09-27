const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Middleware that checks the teacher's token
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { createClass, getTeacherClasses, deleteClass, getAllClassesForAdmin, requestClass, getStudentRequests, getAllClassRequests, updateRequestStatus , deleteClassRequest, adminUpdateClass } = require('../controllers/classController');

// Configure multer storage for Class_Cover_images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../Class_Cover_images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.post('/create', authMiddleware, upload.single('coverImage'), createClass);
router.get('/my-classes', authMiddleware, getTeacherClasses);
router.delete('/:id', authMiddleware, deleteClass);

// The route to access all classes for Admins and Students.
router.get('/all', authMiddleware, getAllClassesForAdmin);

router.post('/request', authMiddleware, requestClass);
router.get('/student-requests', authMiddleware, getStudentRequests);
router.get('/requests/all', authMiddleware, getAllClassRequests);
router.put('/requests/status', authMiddleware, updateRequestStatus);
// The newly added route to completely remove (delete) students' class requests.
router.delete('/requests/:id', authMiddleware, deleteClassRequest);
router.put('/admin/update/:id', authMiddleware, upload.single('coverImage'), adminUpdateClass);

module.exports = router;