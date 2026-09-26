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

    if (req.files && req.files.length > 0) {
      // Keep track of file indices for arrays
      let heroFileIndex = 0;
      let galleryFileIndex = 0;
      let badgeAvatarFileIndex = 0;

      req.files.forEach((file) => {
        const fileUrl = `/swp/${file.filename}`;
        
        if (file.fieldname === 'heroImagesFiles') {
          if (dataToUpdate.heroImages && dataToUpdate.heroImages[heroFileIndex]) {
            dataToUpdate.heroImages[heroFileIndex].image = fileUrl;
          }
          heroFileIndex++;
        } else if (file.fieldname === 'galleryImagesFiles') {
          if (dataToUpdate.galleryItems && dataToUpdate.galleryItems[galleryFileIndex]) {
            dataToUpdate.galleryItems[galleryFileIndex].image = fileUrl;
          }
          galleryFileIndex++;
        } else if (file.fieldname === 'badgeAvatarFiles') {
          if (dataToUpdate.badgeAvatars && dataToUpdate.badgeAvatars[badgeAvatarFileIndex]) {
            dataToUpdate.badgeAvatars[badgeAvatarFileIndex].image = fileUrl;
          }
          badgeAvatarFileIndex++;
        } else if (file.fieldname.startsWith('testimonialFile_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (dataToUpdate.testimonials && dataToUpdate.testimonials[index]) {
            dataToUpdate.testimonials[index].image = fileUrl;
          }
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