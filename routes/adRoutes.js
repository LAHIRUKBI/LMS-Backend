const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { createAd, getActiveAds, getAllAdsAdmin, deleteAdAdmin, updateAdAdmin } = require('../controllers/adController');

const adImgDir = path.join(__dirname, '../Ad_images');
if (!fs.existsSync(adImgDir)) {
  fs.mkdirSync(adImgDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../Ad_images')); 
  },
  filename: function (req, file, cb) {
    // 👇 100% ආරක්ෂිත ක්‍රමය: ඉංග්‍රීසි අකුරු, ඉලක්කම්, තිත් සහ ඉරි හැර අනෙක් සියලුම ලකුණු (වරහන් ද ඇතුළුව) ඉවත් කරයි
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
    cb(null, Date.now() + '-' + safeOriginalName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/image/:filename', (req, res) => {
  try {
    const fileName = req.params.filename; 
    // process.cwd() වෙනුවට __dirname භාවිත කර ඇත
    const filePath = path.join(__dirname, '../Ad_images', fileName);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Image not found');
    }
  } catch (err) {
    console.error("Image Serving Error:", err);
    res.status(500).send('Server Error');
  }
});

// අනිත් Routes
router.post('/create', authMiddleware, upload.array('images', 5), createAd);
router.get('/active', getActiveAds);
router.get('/admin/all', authMiddleware, getAllAdsAdmin);
router.put('/admin/:id', authMiddleware, updateAdAdmin);
router.delete('/admin/:id', authMiddleware, deleteAdAdmin);

module.exports = router;