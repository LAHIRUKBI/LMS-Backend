// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  recipientRole: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);