const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const DashboardSettings = require("../models/DashboardSettings");

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

// Helper function to delete old file from server storage
const deleteOldFile = (filePath) => {
  if (!filePath) return;
  try {
    // filePath can be like "/swp/filename.jpg" or "http://localhost:5000/swp/filename.jpg"
    let relativePath = filePath;
    if (filePath.startsWith("http")) {
      const urlObj = new URL(filePath);
      relativePath = urlObj.pathname;
    }
    const cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
    const absolutePath = path.join(__dirname, "../", cleanPath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (err) {
    console.error("Error deleting old file:", err);
  }
};

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

router.put("/settings", upload.any(), async (req, res) => {
  try {
    let dataToUpdate = JSON.parse(req.body.settingsData || "{}");
    let existingSettings = await DashboardSettings.findOne();

    if (req.files && req.files.length > 0) {
      let heroFileIndex = 0;
      let galleryFileIndex = 0;
      let badgeAvatarFileIndex = 0;

      req.files.forEach((file) => {
        const fileUrl = `/swp/${file.filename}`;
        
        if (file.fieldname === 'heroImagesFiles') {
          if (dataToUpdate.heroImages && dataToUpdate.heroImages[heroFileIndex]) {
            // Delete old hero image if exists
            if (existingSettings && existingSettings.heroImages && existingSettings.heroImages[heroFileIndex]) {
              deleteOldFile(existingSettings.heroImages[heroFileIndex].image);
            }
            dataToUpdate.heroImages[heroFileIndex].image = fileUrl;
          }
          heroFileIndex++;
        } else if (file.fieldname === 'galleryImagesFiles') {
          if (dataToUpdate.galleryItems && dataToUpdate.galleryItems[galleryFileIndex]) {
            if (existingSettings && existingSettings.galleryItems && existingSettings.galleryItems[galleryFileIndex]) {
              deleteOldFile(existingSettings.galleryItems[galleryFileIndex].image);
            }
            dataToUpdate.galleryItems[galleryFileIndex].image = fileUrl;
          }
          galleryFileIndex++;
        } else if (file.fieldname === 'badgeAvatarFiles') {
          if (dataToUpdate.badgeAvatars && dataToUpdate.badgeAvatars[badgeAvatarFileIndex]) {
            if (existingSettings && existingSettings.badgeAvatars && existingSettings.badgeAvatars[badgeAvatarFileIndex]) {
              deleteOldFile(existingSettings.badgeAvatars[badgeAvatarFileIndex].image);
            }
            dataToUpdate.badgeAvatars[badgeAvatarFileIndex].image = fileUrl;
          }
          badgeAvatarFileIndex++;
        } else if (file.fieldname === 'testimonialBgFile') {
          if (existingSettings && existingSettings.testimonialBgImage) {
            deleteOldFile(existingSettings.testimonialBgImage);
          }
          dataToUpdate.testimonialBgImage = fileUrl;
        } else if (file.fieldname.startsWith('testimonialFile_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (dataToUpdate.testimonials && dataToUpdate.testimonials[index]) {
            if (existingSettings && existingSettings.testimonials && existingSettings.testimonials[index]) {
              deleteOldFile(existingSettings.testimonials[index].image);
            }
            dataToUpdate.testimonials[index].image = fileUrl;
          }
        } else if (file.fieldname.startsWith('featureIconFile_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (dataToUpdate.featureItems && dataToUpdate.featureItems[index]) {
            if (existingSettings && existingSettings.featureItems && existingSettings.featureItems[index]) {
              deleteOldFile(existingSettings.featureItems[index].iconImage);
            }
            dataToUpdate.featureItems[index].iconImage = fileUrl;
          }
        }
      });
    }

    let settings = existingSettings;
    if (!settings) {
      settings = new DashboardSettings(dataToUpdate);
    } else {
      Object.assign(settings, dataToUpdate);
    }

    await settings.save();
    res.json({ message: "Dashboard updated successfully!", settings });
  } catch (err) {
    console.error("Backend Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;