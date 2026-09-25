const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { createAd, getActiveAds, getAllAdsAdmin, deleteAdAdmin, updateAdAdmin } = require('../controllers/adController');

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

// The limit has been set to 50MB due to the video size.
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } 
});


router.post('/create', authMiddleware, upload.fields([{ name: 'images', maxCount: 5 },{ name: 'video', maxCount: 1 }]), createAd);
router.get('/active', getActiveAds);
router.get('/admin/all', authMiddleware, getAllAdsAdmin);
router.put('/admin/:id', authMiddleware, upload.fields([{ name: 'images', maxCount: 5 },{ name: 'video', maxCount: 1 }]), updateAdAdmin);
router.delete('/admin/:id', authMiddleware, deleteAdAdmin);

module.exports = router;