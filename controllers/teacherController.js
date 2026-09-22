const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const path = require('path');
const fs = require('fs');

// 1. ගුරුවරයාගේ Profile විස්තර ලබාගැනීම
const getTeacherProfile = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    
    // Password එක හැර අනිත් සියලු විස්තර යැවීම
    const teacher = await Teacher.findById(req.user.id).select('-password');
    res.json(teacher);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 2. Profile විස්තර යාවත්කාලීන කිරීම (Update)
const updateTeacherProfile = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });

    const { teacherId, name, email, subject, phone, address, website, facebook, instagram, password } = req.body;

    // Qualifications string එකක් විදිහට එන නිසා එය parse කරගැනීම
    let parsedQualifications = [];
    if (req.body.qualifications) {
      parsedQualifications = JSON.parse(req.body.qualifications);
    }

    if (teacherId) {
      const existing = await Teacher.findOne({ teacherId, _id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({ message: 'මෙම Teacher ID එක දැනටමත් වෙනත් අයෙකු භාවිත කරයි!' });
      }
    }

    const updateData = { 
      teacherId, name, email, subject, phone, address, website, facebook, instagram, 
      qualifications: parsedQualifications 
    };

    // අලුත් ෆොටෝ එකක් අප්ලෝඩ් කර ඇත්නම්
    if (req.file) {
      // 1. ගුරුවරයාගේ පැරණි profile photo එක database එකෙන් සොයා ගැනීම
      const currentTeacher = await Teacher.findById(req.user.id);
      if (currentTeacher && currentTeacher.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '../profile_photos', currentTeacher.profilePhoto);
        // 2. ෆෝල්ඩරය තුළ පැරණි ගොනුව තිබේ නම් එය මකා දැමීම
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (unlinkErr) {
            console.error("Error deleting old profile photo:", unlinkErr);
          }
        }
      }

      // 3. අලුත් ෆොටෝ එකේ නම updateData වෙත ලබාදීම
      updateData.profilePhoto = req.file.filename;
    }

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'The profile was successfully updated!', teacher: updatedTeacher });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getTeacherProfile,
  updateTeacherProfile
};