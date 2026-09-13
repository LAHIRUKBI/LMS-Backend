const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const authMiddleware = require('../middleware/authMiddleware');

// 1. ගුරුවරයාගේ Profile විස්තර ලබාගැනීම
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    
    // Password එක හැර අනිත් සියලු විස්තර යැවීම
    const teacher = await Teacher.findById(req.user.id).select('-password');
    res.json(teacher);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 2. Profile විස්තර යාවත්කාලීන කිරීම (Update)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });

    const { teacherId, name, email, subject, phone, address, website, facebook, instagram, password } = req.body;

    // වෙනත් ගුරුවරයෙක් මේ Teacher ID එක භාවිතා කරනවාදැයි පරීක්ෂා කිරීම
    if (teacherId) {
      const existing = await Teacher.findOne({ teacherId, _id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({ message: 'මෙම Teacher ID එක දැනටමත් වෙනත් අයෙකු භාවිත කරයි!' });
      }
    }

    // යාවත්කාලීන කළ යුතු දත්ත ලැයිස්තුව
    const updateData = { teacherId, name, email, subject, phone, address, website, facebook, instagram };

    // ගුරුවරයා අලුත් මුරපදයක් ලබා දී ඇත්නම් පමණක් එය Hash කර යාවත්කාලීන කිරීම
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'ප්‍රොෆයිල් එක සාර්ථකව යාවත්කාලීන කරන ලදී!', teacher: updatedTeacher });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;