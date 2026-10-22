const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const authMiddleware = require('../middleware/authMiddleware');
const { createAd, getActiveAds, getAllAdsAdmin, deleteAdAdmin, updateAdAdmin } = require('../controllers/adController');


router.post('/create', authMiddleware, upload.fields([{ name: 'images', maxCount: 5 },{ name: 'video', maxCount: 1 }]), createAd);
router.get('/active', getActiveAds);
router.get('/admin/all', authMiddleware, getAllAdsAdmin);
router.put('/admin/:id', authMiddleware, upload.fields([{ name: 'images', maxCount: 5 },{ name: 'video', maxCount: 1 }]), updateAdAdmin);
router.delete('/admin/:id', authMiddleware, deleteAdAdmin);

module.exports = router;