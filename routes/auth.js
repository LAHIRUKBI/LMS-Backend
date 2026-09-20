const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Controller ගොනුවෙන් functions ඉම්පෝර්ට් කරගැනීම
const {loginUser,registerAdmin} = require('../controllers/authController');

// Routes නිර්මාණය කිරීම
router.post('/login', loginUser);
router.post('/admin-register', authMiddleware, registerAdmin);

module.exports = router;