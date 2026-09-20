const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {getTeacherNotifications,markTeacherNotificationsRead,clearAllTeacherNotifications,deleteTeacherNotification,getAdminNotifications,markAdminNotificationsRead,clearAllAdminNotifications,deleteAdminNotification} = require('../controllers/notificationController');

// --- Admin Routes ---
router.get('/admin', authMiddleware, getAdminNotifications);
router.put('/admin/mark-read', authMiddleware, markAdminNotificationsRead);
router.delete('/admin/clear-all', authMiddleware, clearAllAdminNotifications);
router.delete('/admin/:id', authMiddleware, deleteAdminNotification); // ID සහිත route එක අගට

// --- Teacher Routes ---
router.get('/', authMiddleware, getTeacherNotifications);
router.put('/mark-read', authMiddleware, markTeacherNotificationsRead);
router.delete('/clear-all', authMiddleware, clearAllTeacherNotifications);
router.delete('/:id', authMiddleware, deleteTeacherNotification); // ID සහිත route එක අගට

module.exports = router;