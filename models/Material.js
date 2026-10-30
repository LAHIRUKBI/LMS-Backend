const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'paper'], required: true },
  // Cloudinary URL for PDF/Paper, or YouTube URL for video
  fileUrl: { type: String, required: true },
  // The Unique ID required to delete the file from Cloudinary (for PDFs/papers only)
  filePublicId: { type: String, default: "" },
  // For videos, use the YouTube Video ID (to facilitate the frontend embed player)
  youtubeVideoId: { type: String, default: "" },
  // Cloudinary URL and publicId for the cover image
  coverImage: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" }
  },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  description: { type: String, default: "" },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: "" },
  // Class associations and visibility
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  isPublished: { type: Boolean, default: false },
  // Free material status for public / free page viewing
  isFree: { type: Boolean, default: false },
  // Material Tracking
  isNewForSidebar: { type: Boolean, default: true },
  isNewForTable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);