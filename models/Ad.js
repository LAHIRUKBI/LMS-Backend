const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, required: true }
});

const adSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }], // පින්තූර කිහිපයක URLs ගබඩා කිරීමට
  links: [linkSchema],        // ලින්ක් කිහිපයක් ගබඩා කිරීමට
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);