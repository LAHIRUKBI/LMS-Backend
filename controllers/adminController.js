const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');

// 1. Add Teacher API (Admin ට පමණක් අවසර ඇත)
const addTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. ඔබ Admin කෙනෙකු නොවේ!' });
    }

    const { teacherId, name, email, subject, password } = req.body;

    let existingTeacher = await Teacher.findOne({ $or: [{ teacherId }, { email }] });
    if (existingTeacher) {
      return res.status(400).json({ message: 'මෙම Teacher ID හෝ Email එක දැනටමත් භාවිතයේ පවතී!' });
    }

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
};

// 2. Get All Teachers API
const getAllTeachers = async (req, res) => {
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
};

// 3. Get All Admins API
const getAllAdmins = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const admins = await Admin.find().select('-password').sort({ createdAt: 1 });
    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 4. Delete Admin API
const deleteAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const adminIdToDelete = req.params.id;
    const adminToDelete = await Admin.findById(adminIdToDelete);

    if (!adminToDelete) {
      return res.status(404).json({ message: 'මෙම Admin ගිණුම සොයාගත නොහැක.' });
    }

    if (adminToDelete.isDefault) {
      return res.status(400).json({ message: 'ප්‍රධාන (Super Admin) ගිණුම ඉවත් කළ නොහැක!' });
    }

    if (adminToDelete._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'ඔබට ඔබගේම ගිණුම ඉවත් කළ නොහැක!' });
    }

    await Admin.findByIdAndDelete(adminIdToDelete);
    res.json({ message: 'Admin ගිණුම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 5. Delete Teacher API
const deleteTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const teacherIdToDelete = req.params.id;
    const teacherToDelete = await Teacher.findById(teacherIdToDelete);
    
    if (!teacherToDelete) {
      return res.status(404).json({ message: 'මෙම ගුරුවරයාගේ ගිණුම සොයාගත නොහැක.' });
    }

    await Teacher.findByIdAndDelete(teacherIdToDelete);
    res.json({ message: 'ගුරු ගිණුම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// අදාල Functions සියල්ල Export කිරීම
module.exports = {
  addTeacher,
  getAllTeachers,
  getAllAdmins,
  deleteAdmin,
  deleteTeacher
};