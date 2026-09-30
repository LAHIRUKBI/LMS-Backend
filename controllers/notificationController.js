const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
// පරිශීලකයන්ගේ නම් ලබාගැනීමට Models Import කරගැනීම
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');

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

// 9. Receiving all system notifications (for Admins only)
const getAllSystemNotifications = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    
    // `lean()` converts a Mongoose document into a plain JavaScript object.
    const notifications = await Notification.find().sort({ createdAt: -1 }).lean();

    // Retrieving the name from the relevant collection for each notification.
    for (let notif of notifications) {
      if (notif.userId) {
        let userObj = null;
        
        if (notif.recipientRole === 'student') {
          userObj = await Student.findById(notif.userId).select('name');
        } else if (notif.recipientRole === 'teacher') {
          userObj = await Teacher.findById(notif.userId).select('name');
        } else if (notif.recipientRole === 'admin') {
          userObj = await Admin.findById(notif.userId).select('name');
        }

        // Updating the name if the user is in the system.
        if (userObj) {
          notif.userId = {
            _id: userObj._id,
            name: userObj.name
          };
        }
      }
    }

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 10 Deleting multiple selected notifications at once
const bulkDeleteNotifications = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    const { ids } = req.body;
    await Notification.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Selected notifications deleted successfully' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 11 Accessing Auto-delete Settings
const getNotificationSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    let settings = await NotificationSettings.findOne();
    if (!settings) settings = await NotificationSettings.create({ autoDeleteDays: 30 });
    res.json(settings);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// 12 Updating Auto-delete Settings
const updateNotificationSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    const { autoDeleteDays } = req.body;
    let settings = await NotificationSettings.findOne();
    if (!settings) {
      settings = new NotificationSettings({ autoDeleteDays });
    } else {
      settings.autoDeleteDays = autoDeleteDays;
    }
    await settings.save();
    res.json({ message: 'Auto-delete settings updated successfully', settings });
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
  deleteAdminNotification,
  getAllSystemNotifications,
  bulkDeleteNotifications,
  getNotificationSettings,
  updateNotificationSettings
};