const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const path = require('path');
const fs = require('fs');

// 1. Obtaining the teacher's profile details
const getTeacherProfile = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
    
    // Sending all details except the password.
    const teacher = await Teacher.findById(req.user.id).select('-password');
    res.json(teacher);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 2. Updating Profile Details
const updateTeacherProfile = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });

    const { teacherId, name, email, subject, phone, address, website, password } = req.body;

    let parsedQualifications = [];
    if (req.body.qualifications) {
      parsedQualifications = JSON.parse(req.body.qualifications);
    }

    // Parsing social links
    let parsedSocialLinks = [];
    if (req.body.socialLinks) {
      parsedSocialLinks = JSON.parse(req.body.socialLinks);
    }

    if (teacherId) {
      const existing = await Teacher.findOne({ teacherId, _id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({ message: 'This Teacher ID is already being used by someone else!' });
      }
    }

    const updateData = { 
      teacherId, name, email, subject, phone, address, website, 
      socialLinks: parsedSocialLinks,
      qualifications: parsedQualifications 
    };

    if (req.file) {
      const currentTeacher = await Teacher.findById(req.user.id);
      if (currentTeacher && currentTeacher.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '../profile_photos', currentTeacher.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (unlinkErr) {
            console.error("Error deleting old profile photo:", unlinkErr);
          }
        }
      }
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