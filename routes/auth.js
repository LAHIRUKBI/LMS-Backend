const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher'); // Teacher Model එක import කරගැනීම
const authMiddleware = require('../middleware/authMiddleware');

// Unified Login Endpoint (Admin හෝ Teacher)
router.post('/login', async (req, res) => {
  try {
    const { id, password } = req.body;

    // 1. මුලින්ම Admin කෙනෙක්දැයි පරීක්ෂා කිරීම
    let user = await Admin.findOne({ adminId: id });
    let role = 'admin';

    // 2. Admin නොවේ නම්, Teacher කෙනෙක්දැයි පරීක්ෂා කිරීම
    if (!user) {
      user = await Teacher.findOne({ teacherId: id });
      role = 'teacher';
    }

    // දෙගොල්ලොන්ගෙන්ම කෙනෙක් හමු නොවුණහොත්
    if (!user) {
      return res.status(400).json({ message: 'වැරදි ID එකක් හෝ Password එකක්!' });
    }

    // Password සැසඳීම
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'වැරදි ID එකක් හෝ Password එකක්!' });
    }

    // Payload එක සකස් කිරීම
    const payload = {
      user: {
        id: user._id,
        identifier: role === 'admin' ? user.adminId : user.teacherId,
        name: user.name,
        role: role,
        isDefault: role === 'admin' ? user.isDefault : false,
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: payload.user, message: 'Login සාර්ථකයි!' });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Admin Register Endpoint
router.post('/admin-register', authMiddleware, async (req, res) => {
  try {
    const { adminId, name, email, password } = req.body;

    let existingAdmin = await Admin.findOne({ $or: [{ adminId }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({ message: 'මෙම Admin ID එක හෝ Email එක දැනටමත් භාවිතයේ පවතී!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      adminId,
      name,
      email,
      password: hashedPassword,
      isDefault: false
    });

    await newAdmin.save();
    res.status(201).json({ message: 'නව Admin ගිණුම සාර්ථකව නිර්මාණය කරන ලදී!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;