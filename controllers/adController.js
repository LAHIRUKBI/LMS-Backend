// controllers/adController.js
const Ad = require('../models/Ad');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const { cloudinary } = require('../config/cloudinary');

// Cloudinary URL එකෙන් Public ID ලබාගැනීම සඳහා වන Helper ශ්‍රිතය
const getCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const pathAfterUpload = parts.slice(uploadIndex + 1);
    if (pathAfterUpload[0].startsWith('v') && !isNaN(pathAfterUpload[0].substring(1))) {
      pathAfterUpload.shift();
    }
    const publicIdWithExt = pathAfterUpload.join('/');
    return publicIdWithExt.replace(/\.[^/.]+$/, "");
  } catch (e) {
    return null;
  }
};

exports.createAd = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const { headline, description, status, targetAudience, publishStartDate, publishEndDate, mediaType } = req.body;

    let parsedLinks = [];
    if (req.body.links) {
      parsedLinks = JSON.parse(req.body.links);
    }

    let imageUrls = [];
    let videoUrl = null;

    if (req.files) {
      if (req.files['images']) {
        imageUrls = req.files['images'].map(file => file.path); // Cloudinary Secure URL
      }
      if (req.files['video'] && req.files['video'].length > 0) {
        videoUrl = req.files['video'][0].path; // Cloudinary Secure URL
      }
    }

    const startDate = publishStartDate ? new Date(publishStartDate) : new Date();
    const endDate = publishEndDate ? new Date(publishEndDate) : null;
    const now = new Date();

    const newAd = new Ad({
      headline,
      description,
      mediaType: mediaType || 'image',
      images: imageUrls,
      video: videoUrl,
      links: parsedLinks,
      status: status || 'active',
      targetAudience: targetAudience || 'all',
      publishStartDate: startDate,
      publishEndDate: endDate,
      createdBy: req.user.id
    });

    await newAd.save();

    // Ad එක Active නම් සහ දැන්ම publish වී නම් සිසුන්ට Notifications යැවීම
    if ((status || 'active') === 'active' && startDate <= now) {
      try {
        let query = {};
        if (targetAudience && targetAudience !== 'all') {
          query.grade = targetAudience;
        }

        const students = await Student.find(query);

        const notificationPromises = students.map(student => {
          return Notification.create({
            userId: student._id,
            recipientRole: 'student',
            title: `📢 New Announcement: ${headline}`,
            message: description.length > 80 ? description.substring(0, 80) + '...' : description
          });
        });

        await Promise.all(notificationPromises);
      } catch (notifErr) {
        console.error("Error sending ad notifications to students:", notifErr);
      }
    }

    res.status(201).json({ success: true, message: 'Ad successfully created and students notified!', ad: newAd });
  } catch (error) {
    console.error("Ad creation error:", error);
    res.status(500).json({ success: false, error: 'Server error occurred.' });
  }
};

exports.getActiveAds = async (req, res) => {
  try {
    const now = new Date();

    const ads = await Ad.find({ 
      status: 'active',
      publishStartDate: { $lte: now },
      $or: [
        { publishEndDate: null },
        { publishEndDate: { $gt: now } }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data retrieval error.' });
  }
};

exports.getAllAdsAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data retrieval error.' });
  }
};

exports.deleteAdAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found.' });
    }

    // Cloudinary වෙතින් Images Delete කිරීම
    if (ad.images && Array.isArray(ad.images)) {
      for (const imgUrl of ad.images) {
        const publicId = getCloudinaryPublicId(imgUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
          } catch (e) {
            console.error("Cloudinary ad image delete error:", e);
          }
        }
      }
    }

    // Cloudinary වෙතින් Video එක Delete කිරීම
    if (ad.video) {
      const vidPublicId = getCloudinaryPublicId(ad.video);
      if (vidPublicId) {
        try {
          await cloudinary.uploader.destroy(vidPublicId, { resource_type: 'video' });
        } catch (e) {
          console.error("Cloudinary ad video delete error:", e);
        }
      }
    }

    await Ad.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Ad successfully deleted.' });
  } catch (error) {
    console.error("Delete Ad Error:", error); 
    res.status(500).json({ success: false, error: 'Deletion error.' });
  }
};

exports.updateAdAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const { headline, description, status, links, mediaType, targetAudience, publishStartDate, publishEndDate, existingImages } = req.body;

    let parsedLinks = [];
    if (links) {
      try {
        parsedLinks = typeof links === 'string' ? JSON.parse(links) : links;
      } catch (e) {
        parsedLinks = [];
      }
    }

    let parsedExistingImages = [];
    if (existingImages) {
      try {
        parsedExistingImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch (e) {
        parsedExistingImages = [];
      }
    }

    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found.' });
    }

    // අයින් කරන ලද පැරණි images Cloudinary වෙතින් මකා දැමීම
    if (ad.images && Array.isArray(ad.images)) {
      const removedImages = ad.images.filter(img => !parsedExistingImages.includes(img));
      for (const imgUrl of removedImages) {
        const publicId = getCloudinaryPublicId(imgUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
          } catch (e) {}
        }
      }
    }

    let finalImages = parsedExistingImages;

    // අලුතින් upload වූ images Cloudinary වෙතින් ලබා ගැනීම
    if (req.files && req.files['images'] && req.files['images'].length > 0) {
      const newImageUrls = req.files['images'].map(file => file.path);
      finalImages = [...finalImages, ...newImageUrls];
    }

    let finalVideo = ad.video;

    // නව video එකක් upload කර ඇත්නම් පැරණි video එක Cloudinary වෙතින් delete කර නව video එක assign කිරීම
    if (req.files && req.files['video'] && req.files['video'].length > 0) {
      if (ad.video) {
        const oldVidPubId = getCloudinaryPublicId(ad.video);
        if (oldVidPubId) {
          try { await cloudinary.uploader.destroy(oldVidPubId, { resource_type: 'video' }); } catch (e) {}
        }
      }
      finalVideo = req.files['video'][0].path;
    } else if (req.body.hasVideo === 'false') {
      if (ad.video) {
        const oldVidPubId = getCloudinaryPublicId(ad.video);
        if (oldVidPubId) {
          try { await cloudinary.uploader.destroy(oldVidPubId, { resource_type: 'video' }); } catch (e) {}
        }
      }
      finalVideo = null;
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      req.params.id,
      { 
        headline, 
        description, 
        status: status || ad.status, 
        mediaType: mediaType || ad.mediaType,
        targetAudience: targetAudience || ad.targetAudience,
        publishStartDate: publishStartDate ? new Date(publishStartDate) : ad.publishStartDate,
        publishEndDate: publishEndDate ? new Date(publishEndDate) : null,
        images: finalImages,
        video: finalVideo,
        links: parsedLinks 
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Advertisement successfully updated!', ad: updatedAd });
  } catch (error) {
    console.error("Update Ad Error:", error);
    res.status(500).json({ success: false, error: 'Update error occurred.' });
  }
};