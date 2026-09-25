const path = require('path');
const fs = require('fs');
const Ad = require('../models/Ad');

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

    // Distinguishing between images and videos
    if (req.files) {
      if (req.files['images']) {
        imageUrls = req.files['images'].map(file => `/advertisement/${file.filename}`);
      }
      if (req.files['video'] && req.files['video'].length > 0) {
        videoUrl = `/advertisement/${req.files['video'][0].filename}`;
      }
    }

    const newAd = new Ad({
      headline,
      description,
      mediaType: mediaType || 'image',
      images: imageUrls,
      video: videoUrl,
      links: parsedLinks,
      status: status || 'active',
      targetAudience: targetAudience || 'all',
      publishStartDate: publishStartDate ? new Date(publishStartDate) : Date.now(),
      publishEndDate: publishEndDate ? new Date(publishEndDate) : null,
      createdBy: req.user.id
    });

    await newAd.save();
    res.status(201).json({ success: true, message: 'Ad successfully created!', ad: newAd });
  } catch (error) {
    console.error("Ad creation error:", error);
    res.status(500).json({ success: false, error: 'Server error occurred.' });
  }
};

exports.getActiveAds = async (req, res) => {
  try {
    const now = new Date();
    
    // Retrieving only the active ads that should be displayed at this moment.
    const ads = await Ad.find({ 
      status: 'active',
      publishStartDate: { $lte: now }, // The start time must be earlier than the current moment (it must be in the past).
      $or: [
        { publishEndDate: null }, // If a deadline hasn't been given...
        { publishEndDate: { $gt: now } } // Or if the deadline hasn't arrived yet
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

    // Images delete කිරීම
    if (ad.images && Array.isArray(ad.images)) {
      ad.images.forEach(imgUrl => {
        if (typeof imgUrl === 'string' && imgUrl.trim() !== '') {
          const cleanImgUrl = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
          const filePath = path.join(__dirname, '..', cleanImgUrl);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
          }
        }
      });
    }

    // Deleting the video
    if (ad.video && typeof ad.video === 'string' && ad.video.trim() !== '') {
      const cleanVideoUrl = ad.video.startsWith('/') ? ad.video.substring(1) : ad.video;
      const filePath = path.join(__dirname, '..', cleanVideoUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
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

    // Retrieving the images left for deletion by the Admin from the initial image list.
    let finalImages = parsedExistingImages;

    // Adding new images if they have been uploaded.
    if (req.files && req.files['images'] && req.files['images'].length > 0) {
      const newImageUrls = req.files['images'].map(file => `/advertisement/${file.filename}`);
      finalImages = [...finalImages, ...newImageUrls];
    }

    let finalVideo = ad.video;
    // Replacing a newly uploaded video
    if (req.files && req.files['video'] && req.files['video'].length > 0) {
      finalVideo = `/advertisement/${req.files['video'][0].filename}`;
    } else if (req.body.hasVideo === 'false') {
      finalVideo = null; // Video එක ඉවත් කර ඇත්නම්
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