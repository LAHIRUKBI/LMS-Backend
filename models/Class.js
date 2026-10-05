const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  grade: { type: String, required: true },
  customGradeName: { type: String, default: "" }, 
  medium: { type: String, enum: ['Sinhala Medium', 'English Medium'], required: true },
  mode: { type: String, enum: ['Online', 'Offline'], required: true },
  
  // Online mode සහ Link Validity කාලසීමාව
  onlineLink: { type: String, default: "" },
  provideLater: { type: Boolean, default: false },
  linkDisplayMode: { type: String, enum: ['immediate', 'scheduled'], default: 'scheduled' }, // 'immediate' හෝ 'scheduled'
  linkStartDateTime: { type: Date, default: null }, 
  linkEndDateTime: { type: Date, default: null },   

  // Offline mode සඳහා
  instituteName: { type: String, default: "" },
  instituteAddress: { type: String, default: "" },

  day: { type: String, required: true }, 
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },   
  coverImage: { type: String, default: "" }, 
  description: { type: String, default: "" }  
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);