const Notification = require('../models/Notification');

// 1. ගුරුවරයාගේ Notifications ලබා ගැනීම
const getTeacherNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 2. Teacher Notifications කියෙව්වා (Read) ලෙස සලකුණු කිරීම
const markTeacherNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "Marked all as read" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 3. Teacher ගේ සියලුම Notifications මකා දැමීම (Clear All)
const clearAllTeacherNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 4. Teacher ගේ තනි Notification එකක් මකා දැමීම
const deleteTeacherNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 5. Admin ගේ Notifications ලබා ගැනීම
const getAdminNotifications = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    const notifications = await Notification.find({ recipientRole: 'admin' }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 6. Admin Notifications Read (කියවූ) ලෙස සලකුණු කිරීම
const markAdminNotificationsRead = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    await Notification.updateMany({ recipientRole: 'admin', isRead: false }, { isRead: true });
    res.json({ message: "Marked all as read" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 7. Admin ගේ සියලුම Notifications මකා දැමීම (Clear All)
const clearAllAdminNotifications = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    await Notification.deleteMany({ recipientRole: 'admin' });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 8. Admin ගේ එක Notification එකක් පමණක් මකා දැමීම
const deleteAdminNotification = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getTeacherNotifications,
  markTeacherNotificationsRead,
  clearAllTeacherNotifications,
  deleteTeacherNotification,
  getAdminNotifications,
  markAdminNotificationsRead,
  clearAllAdminNotifications,
  deleteAdminNotification
};