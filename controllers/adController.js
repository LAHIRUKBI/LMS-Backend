const path = require('path');
const fs = require('fs');
const Ad = require('../models/Ad');

exports.createAd = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const { headline, description, status } = req.body;
    
    let parsedLinks = [];
    if (req.body.links) {
      parsedLinks = JSON.parse(req.body.links);
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // 👇 මෙහි /advertisement/ ලෙස වෙනස් කර ඇත
      imageUrls = req.files.map(file => `/advertisement/${file.filename}`);
    }

    const newAd = new Ad({
      headline,
      description,
      images: imageUrls,
      links: parsedLinks,
      status: status || 'active',
      createdBy: req.user.id
    });

    await newAd.save();
    res.status(201).json({ success: true, message: 'Ad එක සාර්ථකව නිර්මාණය කරන ලදී!', ad: newAd });
  } catch (error) {
    console.error("Ad creation error:", error);
    res.status(500).json({ success: false, error: 'සර්වර් දෝෂයක් සිදුව ඇත.' });
  }
};

exports.getActiveAds = async (req, res) => {
  try {
    const ads = await Ad.find({ status: 'active' }).sort({ createdAt: -1 });
    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ success: false, error: 'දත්ත ලබාගැනීමේ දෝෂයක්.' });
  }
};

exports.getAllAdsAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ success: false, error: 'දත්ත ලබාගැනීමේ දෝෂයක්.' });
  }
};

exports.deleteAdAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad එක සොයාගත නොහැක.' });
    }

    if (ad.images && Array.isArray(ad.images)) {
      ad.images.forEach(imgUrl => {
        if (typeof imgUrl === 'string' && imgUrl.trim() !== '') {
          const cleanImgUrl = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
          const filePath = path.join(__dirname, '..', cleanImgUrl);
          
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (unlinkErr) {
              console.error("File Delete Error:", unlinkErr);
            }
          }
        }
      });
    }

    await Ad.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'දැන්වීම සාර්ථකව මකා දමන ලදී.' });
  } catch (error) {
    console.error("Delete Ad Error:", error); 
    res.status(500).json({ success: false, error: 'මකාදැමීමේ දෝෂයක්.' });
  }
};

exports.updateAdAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const { headline, description, status, links } = req.body;

    const updatedAd = await Ad.findByIdAndUpdate(
      req.params.id,
      { headline, description, status, links },
      { new: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ success: false, message: 'Ad එක සොයාගත නොහැක.' });
    }

    res.status(200).json({ success: true, message: 'දැන්වීම සාර්ථකව යාවත්කාලීන කරන ලදී.', ad: updatedAd });
  } catch (error) {
    res.status(500).json({ success: false, error: 'යාවත්කාලීන කිරීමේ දෝෂයක්.' });
  }
};