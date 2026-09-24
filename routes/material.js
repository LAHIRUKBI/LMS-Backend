const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

// Controller ගොනුවෙන් functions ඉම්පෝර්ට් කරගැනීම
const {uploadMaterial,getMyMaterials,deleteMyMaterial,publishMaterial,getAllMaterialsAdmin,updateMaterialStatus,deleteMaterialAdmin, getMaterialsByClass,
  getStudentMaterials} = require('../controllers/materialController');

// 'uploads' folder එක නැත්නම් එය ස්වයංක්‍රීයව සෑදීම
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const coverDir = path.join(__dirname, '../PDF_covers');
if (!fs.existsSync(coverDir)) {
  fs.mkdirSync(coverDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      cb(null, 'PDF_covers/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB සීමාව (Cover image සඳහා)
});

// Routes නිර්මාණය කිරීම
router.post('/upload', authMiddleware, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), uploadMaterial)
router.get('/my-materials', authMiddleware, getMyMaterials);
router.get('/admin/all', authMiddleware, getAllMaterialsAdmin);

// Parameter සහිත routes පහළින් තැබීම වඩාත් සුදුසුයි
router.get('/student/all', authMiddleware, getStudentMaterials);
router.get('/class/:classId', authMiddleware, getMaterialsByClass);
router.put('/:id/publish', authMiddleware, publishMaterial);
router.put('/admin/:id/status', authMiddleware, updateMaterialStatus);
router.delete('/admin/:id', authMiddleware, deleteMaterialAdmin);
router.delete('/:id', authMiddleware, deleteMyMaterial);

// ================= Student API =================

// සිසුන්ට අනුමත වූ (Approved) සියලුම පාඩම් ලබා දීම
router.get('/student/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    
    // status එක 'approved' වන ඒවා පමණක් ලබාගැනීම
    const materials = await Material.find({ status: 'approved' })
      .populate('teacherId', 'name subject') // ගුරුවරයාගේ නම ලබා ගැනීම
      .sort({ createdAt: -1 });
      
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;