const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

// Controller ගොනුවෙන් functions ඉම්පෝර්ට් කරගැනීම
const {uploadMaterial,getMyMaterials,deleteMyMaterial,publishMaterial,getAllMaterialsAdmin,updateMaterialStatus,deleteMaterialAdmin} = require('../controllers/materialController');

// 'uploads' folder එක නැත්නම් එය ස්වයංක්‍රීයව සෑදීම
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Files සේව් වෙන folder එක
  },
  filename: function (req, file, cb) {
    // එකම නමින් files ආවොත් overwrite වෙන එක වලක්වන්න අගට Date එකක් දානවා
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ storage: storage });

// Routes නිර්මාණය කිරීම
router.post('/upload', authMiddleware, upload.single('file'), uploadMaterial);
router.get('/my-materials', authMiddleware, getMyMaterials);
router.get('/admin/all', authMiddleware, getAllMaterialsAdmin);

// Parameter සහිත routes පහළින් තැබීම වඩාත් සුදුසුයි
router.put('/:id/publish', authMiddleware, publishMaterial);
router.put('/admin/:id/status', authMiddleware, updateMaterialStatus);
router.delete('/admin/:id', authMiddleware, deleteMaterialAdmin);
router.delete('/:id', authMiddleware, deleteMyMaterial);

module.exports = router;