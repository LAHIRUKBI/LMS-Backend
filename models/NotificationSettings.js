const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  autoDeleteDays: { type: Number, default: 30 } // Default දින 30
});

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);