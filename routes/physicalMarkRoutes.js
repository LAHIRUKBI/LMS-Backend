// routes/physicalMarkRoutes.js
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const {
  addPhysicalMark,
  getPhysicalMarks,
  getPhysicalMarksByTeacher,
  getPhysicalMarksByIndex,
  deletePhysicalMark,
  getAdminPhysicalMarks,
  deleteAdminPhysicalMark,
  deleteAdminPhysicalClass,
  getPhysicalMarkTeachers,
  assignLegacyPhysicalMarkTeacher
} = require('../controllers/physicalMarkController');
const { authenticatePhysicalMarks, allowPhysicalRoles } = require('../middleware/physicalMarksAccess');

// NEW: Throttle public index searches. This does NOT replace student verification.
// Install in backend: npm install express-rate-limit
const studentMarksLookupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 60,                // up to 60 requests per IP per window (may be shared behind a NAT)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many result searches. Please try again later.'
  }
});

// NEW: Student lookup is separate from teacher/admin endpoints.
// GET /api/physical-marks/check/:indexNumber
// SECURITY: Index-only public lookup reveals identifiable student results to
// anyone who knows/guesses an index. For private results, add verified student
// authentication + ownership checks before production deployment.
router.get('/check/:indexNumber', studentMarksLookupLimiter, getPhysicalMarksByIndex);

// Existing teacher/admin routes — UNCHANGED.
router.post('/add', authenticatePhysicalMarks, allowPhysicalRoles('teacher'), addPhysicalMark);
router.get('/', authenticatePhysicalMarks, allowPhysicalRoles('teacher', 'admin'), getPhysicalMarks);
router.get('/all', authenticatePhysicalMarks, allowPhysicalRoles('teacher', 'admin'), getPhysicalMarksByTeacher);

// New admin routes. Always register before /:id.
router.get('/admin/all', authenticatePhysicalMarks, allowPhysicalRoles('admin'), getAdminPhysicalMarks);
router.get('/admin/teachers', authenticatePhysicalMarks, allowPhysicalRoles('admin'), getPhysicalMarkTeachers);
router.patch('/admin/assign-teacher', authenticatePhysicalMarks, allowPhysicalRoles('admin'), assignLegacyPhysicalMarkTeacher);
router.delete('/admin/class', authenticatePhysicalMarks, allowPhysicalRoles('admin'), deleteAdminPhysicalClass);
router.delete('/admin/:id', authenticatePhysicalMarks, allowPhysicalRoles('admin'), deleteAdminPhysicalMark);

// Previously unauthenticated: now prevent deleting anyone else's marks.
router.delete('/:id', authenticatePhysicalMarks, allowPhysicalRoles('teacher', 'admin'), deletePhysicalMark);

module.exports = router;
