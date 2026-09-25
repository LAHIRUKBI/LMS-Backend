const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const DashboardSettings = require("../models/DashboardSettings");

// Multer Storage Configuration for /swp folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../swp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get Dashboard Settings
router.get("/settings", async (req, res) => {
  try {
    let settings = await DashboardSettings.findOne();
    if (!settings) {
      settings = await DashboardSettings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Dashboard Settings with Image Upload Support
router.put("/settings", upload.fields([
  { name: 'heroImagesFiles', maxCount: 10 },
  { name: 'galleryImagesFiles', maxCount: 10 }
]), async (req, res) => {
  try {
    let dataToUpdate = JSON.parse(req.body.settingsData || "{}");

    // Handle Hero Images Files if uploaded
    if (req.files && req.files['heroImagesFiles']) {
      req.files['heroImagesFiles'].forEach((file, index) => {
        const fileUrl = `/swp/${file.filename}`;
        // Map file to the corresponding hero image index if specified, or push/update
        if (dataToUpdate.heroImages && dataToUpdate.heroImages[index]) {
          dataToUpdate.heroImages[index].image = fileUrl;
        }
      });
    }

    // Handle Gallery Images Files if uploaded
    if (req.files && req.files['galleryImagesFiles']) {
      req.files['galleryImagesFiles'].forEach((file, index) => {
        const fileUrl = `/swp/${file.filename}`;
        if (dataToUpdate.galleryItems && dataToUpdate.galleryItems[index]) {
          dataToUpdate.galleryItems[index].image = fileUrl;
        }
      });
    }

    let settings = await DashboardSettings.findOne();
    if (!settings) {
      settings = new DashboardSettings(dataToUpdate);
    } else {
      Object.assign(settings, dataToUpdate);
    }

    await settings.save();
    res.json({ message: "Dashboard updated successfully!", settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;