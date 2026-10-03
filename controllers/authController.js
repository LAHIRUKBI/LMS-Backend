const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');

// 1. Unified Login Endpoint (Admin or Teacher)
const loginUser = async (req, res) => {
  try {
    const { id, password } = req.body;

    // 1. First, checking whether it is an admin.
    let user = await Admin.findOne({ adminId: id });
    let role = 'admin';

    // 2. Checking if the user is a teacher (if not an admin)
    if (!user) {
      user = await Teacher.findOne({ teacherId: id });
      role = 'teacher';
    }

    // If a person from either side is not met
    if (!user) {
      return res.status(400).json({ message: 'Incorrect ID or password!' });
    }

    // Password Comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect ID or password!' });
    }

    // Preparing the payload
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
};

// 2. Admin Register Endpoint
const registerAdmin = async (req, res) => {
  try {
    const { adminId, name, email, password } = req.body;

    let existingAdmin = await Admin.findOne({ $or: [{ adminId }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({ message: 'This Admin ID or Email is already in use!' });
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
    res.status(201).json({ message: 'The new admin account was successfully created!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


module.exports = {
  loginUser,
  registerAdmin
};