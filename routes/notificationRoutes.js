// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');

// ගුරුවරයාගේ Notifications ලබා ගැනීම
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Notifications කියෙව්වා (Read) ලෙස සලකුණු කිරීම
router.put('/mark-read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "Marked all as read" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Admin ගේ Notifications ලබා ගැනීම
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    const notifications = await Notification.find({ recipientRole: 'admin' }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Admin Notifications Read (කියවූ) ලෙස සලකුණු කිරීම
router.put('/admin/mark-read', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    await Notification.updateMany({ recipientRole: 'admin', isRead: false }, { isRead: true });
    res.json({ message: "Marked all as read" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;