const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const DashboardSettings = require("../models/DashboardSettings");
const { cloudinary, upload } = require("../config/cloudinary");


// Helper function to delete old file from server storage
const deleteOldFile = async (filePath) => {
  if (!filePath) return;
  try {
    // If stored on Cloudinary
    if (filePath.includes("cloudinary.com") || filePath.includes("res.cloudinary.com")) {
      const urlParts = filePath.split('/');
      const lastPart = urlParts.pop(); // filename with extension
      const folderPart = urlParts.slice(urlParts.indexOf('upload') + 2).join('/');
      const publicId = (folderPart ? folderPart + '/' : '') + lastPart.replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
      return;
    }

    // Fallback: If it was a local file stored previously
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

      for (const file of req.files) {
        // Cloudinary provides the full secure public URL in file.path
        const fileUrl = file.path || file.secure_url;
        
        if (file.fieldname === 'heroImagesFiles') {
          if (dataToUpdate.heroImages && dataToUpdate.heroImages[heroFileIndex]) {
            if (existingSettings && existingSettings.heroImages && existingSettings.heroImages[heroFileIndex]) {
              await deleteOldFile(existingSettings.heroImages[heroFileIndex].image);
            }
            dataToUpdate.heroImages[heroFileIndex].image = fileUrl;
          }
          heroFileIndex++;
        } else if (file.fieldname === 'galleryImagesFiles') {
          if (dataToUpdate.galleryItems && dataToUpdate.galleryItems[galleryFileIndex]) {
            if (existingSettings && existingSettings.galleryItems && existingSettings.galleryItems[galleryFileIndex]) {
              await deleteOldFile(existingSettings.galleryItems[galleryFileIndex].image);
            }
            dataToUpdate.galleryItems[galleryFileIndex].image = fileUrl;
          }
          galleryFileIndex++;
        } else if (file.fieldname === 'badgeAvatarFiles') {
          if (dataToUpdate.badgeAvatars && dataToUpdate.badgeAvatars[badgeAvatarFileIndex]) {
            if (existingSettings && existingSettings.badgeAvatars && existingSettings.badgeAvatars[badgeAvatarFileIndex]) {
              await deleteOldFile(existingSettings.badgeAvatars[badgeAvatarFileIndex].image);
            }
            dataToUpdate.badgeAvatars[badgeAvatarFileIndex].image = fileUrl;
          }
          badgeAvatarFileIndex++;
        } else if (file.fieldname === 'testimonialBgFile') {
          if (existingSettings && existingSettings.testimonialBgImage) {
            await deleteOldFile(existingSettings.testimonialBgImage);
          }
          dataToUpdate.testimonialBgImage = fileUrl;
        } else if (file.fieldname.startsWith('testimonialFile_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (dataToUpdate.testimonials && dataToUpdate.testimonials[index]) {
            if (existingSettings && existingSettings.testimonials && existingSettings.testimonials[index]) {
              await deleteOldFile(existingSettings.testimonials[index].image);
            }
            dataToUpdate.testimonials[index].image = fileUrl;
          }
        } else if (file.fieldname.startsWith('featureIconFile_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (dataToUpdate.featureItems && dataToUpdate.featureItems[index]) {
            if (existingSettings && existingSettings.featureItems && existingSettings.featureItems[index]) {
              await deleteOldFile(existingSettings.featureItems[index].iconImage);
            }
            dataToUpdate.featureItems[index].iconImage = fileUrl;
          }
        }
      }
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