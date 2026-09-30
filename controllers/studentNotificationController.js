// controllers/studentNotificationController.js
const Notification = require('../models/Notification');

// 1. Receiving the student's notifications
const getStudentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id, recipientRole: 'student' }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 2. Marking student notifications as read
const markStudentNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, recipientRole: 'student', isRead: false }, { isRead: true });
    res.json({ message: "Marked all as read" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 3. Deleting a single student notification
const deleteStudentNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 4. Deleting all student notifications (Clear All)
const clearAllStudentNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id, recipientRole: 'student' });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getStudentNotifications,
  markStudentNotificationsRead,
  deleteStudentNotification,
  clearAllStudentNotifications
};