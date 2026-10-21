const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const {
  uploadMaterial,
  getMyMaterials,
  deleteMyMaterial,
  publishMaterial,
  getAllMaterialsAdmin,
  updateMaterialStatus,
  deleteMaterialAdmin,
  getMaterialsByClass,
  getStudentMaterials,
  getNewMaterialCount,
  clearMaterialSidebarBadge,
  clearMaterialCardDot,
  getFreeMaterialsForPublic
} = require('../controllers/materialController');

// Multer configuration for uploading a PDF file and a cover image to Cloudinary
const materialUploadFields = upload.fields([
  { name: 'file', maxCount: 1 },        // PDF / Paper
  { name: 'coverImage', maxCount: 1 }   // Image
]);

// 1. Teacher Upload Route
router.post('/upload', authMiddleware, materialUploadFields, uploadMaterial);

// 2. Teacher Material Routes
router.get('/my-materials', authMiddleware, getMyMaterials);
router.put('/:id/publish', authMiddleware, publishMaterial);
router.delete('/:id', authMiddleware, deleteMyMaterial);

// 3. Admin Material Routes
router.get('/admin/all', authMiddleware, getAllMaterialsAdmin);
router.put('/admin/:id/status', authMiddleware, updateMaterialStatus);
router.delete('/admin/:id', authMiddleware, deleteMaterialAdmin);

// 4. Admin Material Tracking Routes
router.get('/admin/new-count', authMiddleware, getNewMaterialCount);
router.put('/admin/clear-sidebar', authMiddleware, clearMaterialSidebarBadge);
router.put('/admin/:id/clear-dot', authMiddleware, clearMaterialCardDot);

// 5. Public / Free Materials
router.get('/free/all', getFreeMaterialsForPublic);

// 6. Student Routes (Place routes with dynamic parameters below)
router.get('/student/all', authMiddleware, getStudentMaterials);
router.get('/class/:classId', authMiddleware, getMaterialsByClass);

module.exports = router;