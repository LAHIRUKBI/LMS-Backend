const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  isPublished: { type: Boolean, default: true }, // Admin විසින් සෘජුව දමන ඒවා true වේ. Student messages false වේ.
  studentName: { type: String, default: '' },
  studentEmail: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('FAQ', faqSchema);