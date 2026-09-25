const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, required: true }
});

const adSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  description: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video', 'both'], default: 'image' },
  images: [{ type: String }],
  video: { type: String, default: null },
  links: [linkSchema],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  publishStartDate: { type: Date, default: Date.now }, 
  publishEndDate: { type: Date, default: null }, 
  targetAudience: { type: String, default: 'all' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);