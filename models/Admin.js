const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  phoneNumber: { type: String, default: "" },
  profilePhoto: { type: String, default: "" },          // Cloudinary HTTPS URL or old local path
  profilePhotoPublicId: { type: String, default: "" }   // The ID required for deletion from Cloudinary
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);