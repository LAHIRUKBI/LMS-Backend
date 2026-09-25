const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { createAd, getActiveAds, getAllAdsAdmin, deleteAdAdmin, updateAdAdmin } = require('../controllers/adController');

// 👇 අලුත් advertisement ෆෝල්ඩරය සෑදීම
const adImgDir = path.join(__dirname, '../advertisement');
if (!fs.existsSync(adImgDir)) {
  fs.mkdirSync(adImgDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, adImgDir); 
  },
  filename: function (req, file, cb) {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
    cb(null, 'AD-' + Date.now() + '-' + safeOriginalName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/create', authMiddleware, upload.array('images', 5), createAd);
router.get('/active', getActiveAds);
router.get('/admin/all', authMiddleware, getAllAdsAdmin);
router.put('/admin/:id', authMiddleware, updateAdAdmin);
router.delete('/admin/:id', authMiddleware, deleteAdAdmin);

module.exports = router;