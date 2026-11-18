// routes/physicalMarkRoutes.js
const express = require('express');
const router = express.Router();
const {
  addPhysicalMark,
  getPhysicalMarks,
  getPhysicalMarksByTeacher,
  deletePhysicalMark,
  getAdminPhysicalMarks,
  deleteAdminPhysicalMark,
  deleteAdminPhysicalClass,
  getPhysicalMarkTeachers,
  assignLegacyPhysicalMarkTeacher
} = require('../controllers/physicalMarkController');
const { authenticatePhysicalMarks, allowPhysicalRoles } = require('../middleware/physicalMarksAccess');

// Protect BOTH read URLs. Teachers receive only their own records.
// Admin-only /admin/all remains available separately.
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
