// models/Folder.js
const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null }, // Sub-folders සඳහා
  // Publishing fields
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  isPublished: { type: Boolean, default: false },
  isFree: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);