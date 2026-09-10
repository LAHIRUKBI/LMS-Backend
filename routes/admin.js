const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/authMiddleware');

// 1. Add Teacher API (Admin ට පමණක් අවසර ඇත)
router.post('/add-teacher', authMiddleware, async (req, res) => {
  try {
    // Request එක එවා ඇත්තේ Admin කෙනෙක්දැයි තහවුරු කර ගැනීම
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. ඔබ Admin කෙනෙකු නොවේ!' });
    }

    const { teacherId, name, email, subject, password } = req.body;

    // Teacher ID හෝ Email එකෙන් කෙනෙක් සිටීදැයි බැලීම
    let existingTeacher = await Teacher.findOne({ $or: [{ teacherId }, { email }] });
    if (existingTeacher) {
      return res.status(400).json({ message: 'මෙම Teacher ID හෝ Email එක දැනටමත් භාවිතයේ පවතී!' });
    }

    // Password Hash කිරීම
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newTeacher = new Teacher({
      teacherId,
      name,
      email,
      subject,
      password: hashedPassword,
    });

    await newTeacher.save();
    res.status(201).json({ message: 'ගුරුවරයා සාර්ථකව පද්ධතියට ලියාපදිංචි කරන ලදී!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 2. Get All Teachers API (ලියාපදිංචි සියලුම ගුරුවරුන් බලාගැනීමට)
router.get('/teachers', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const teachers = await Teacher.find().select('-password').sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//  Get All Admins API
router.get('/admins', authMiddleware, async (req, res) => {
  try {
    // Request එක එවා ඇත්තේ Admin කෙනෙක්දැයි තහවුරු කර ගැනීම
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    // Password එක හැර අනිත් සියලුම දත්ත ලබා ගැනීම ('-password')
    const admins = await Admin.find().select('-password').sort({ createdAt: 1 });
    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Admin කෙනෙක්ව ඉවත් කිරීමේ (Delete) API එක
router.delete('/admins/:id', authMiddleware, async (req, res) => {
  try {
    // Request එක එවා ඇත්තේ Admin කෙනෙක්දැයි තහවුරු කර ගැනීම
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const adminIdToDelete = req.params.id;

    // මකා දැමීමට යන Admin ගේ විස්තර ලබා ගැනීම
    const adminToDelete = await Admin.findById(adminIdToDelete);

    if (!adminToDelete) {
      return res.status(404).json({ message: 'මෙම Admin ගිණුම සොයාගත නොහැක.' });
    }

    // ආරක්ෂිත පියවර 1: Default Admin (Super Admin) ඉවත් කළ නොහැක
    if (adminToDelete.isDefault) {
      return res.status(400).json({ message: 'ප්‍රධාන (Super Admin) ගිණුම ඉවත් කළ නොහැක!' });
    }

    // ආරක්ෂිත පියවර 2: තමාගේම ගිණුම තමාටම මකා දැමිය නොහැක (අවශ්‍ය නම් පමණක්)
    if (adminToDelete._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'ඔබට ඔබගේම ගිණුම ඉවත් කළ නොහැක!' });
    }

    // Admin ව දත්ත සමුදායෙන් ඉවත් කිරීම
    await Admin.findByIdAndDelete(adminIdToDelete);
    
    res.json({ message: 'Admin ගිණුම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Teacher කෙනෙක්ව ඉවත් කිරීමේ (Delete) API එක
router.delete('/teachers/:id', authMiddleware, async (req, res) => {
  try {
    // Request එක එවා ඇත්තේ Admin කෙනෙක්දැයි තහවුරු කර ගැනීම
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const teacherIdToDelete = req.params.id;

    const teacherToDelete = await Teacher.findById(teacherIdToDelete);
    if (!teacherToDelete) {
      return res.status(404).json({ message: 'මෙම ගුරුවරයාගේ ගිණුම සොයාගත නොහැක.' });
    }

    // Teacher ව දත්ත සමුදායෙන් ඉවත් කිරීම
    await Teacher.findByIdAndDelete(teacherIdToDelete);
    
    res.json({ message: 'ගුරු ගිණුම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;