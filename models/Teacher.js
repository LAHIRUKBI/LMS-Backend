const mongoose = require('mongoose');

const qualificationSchema = new mongoose.Schema({
  institution: { type: String, required: true }, // University / Institute
  degree: { type: String, required: true },      // Degree / Course Name
  period: { type: String, required: true },      // Time period (e.g., 2018 - 2022)
  description: { type: String, default: "" }     // Additional details
});

// The Dynamic Social Media Schema
const socialLinkSchema = new mongoose.Schema({
  platform: { type: String, required: true }, // Ex: LinkedIn, Facebook, Instagram, Twitter
  url: { type: String, required: true }      // The relevant URL
});

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, default: "",sparse: true, set: (v) => (v === "" ? null : v) },
  subject: { type: String, required: true },
  password: { type: String, required: true },
  
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  website: { type: String, default: "" },
  socialLinks: [socialLinkSchema], // The dynamic socialLinks array
  profilePhoto: { type: String, default: "" }, // For the Unique ID / Filename to be saved
  qualifications: [qualificationSchema]        // Educational qualifications (as an array)
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);