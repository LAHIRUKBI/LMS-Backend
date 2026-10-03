const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {loginUser,registerAdmin} = require('../controllers/authController');


router.post('/login', loginUser);
router.post('/admin-register', authMiddleware, registerAdmin);

module.exports = router;