const mongoose = require('mongoose');

const qualificationSchema = new mongoose.Schema({
  institution: { type: String, required: true }, // University / Institute
  degree: { type: String, required: true },      // Degree / Course Name
  period: { type: String, required: true },      // Time period (e.g., 2018 - 2022)
  description: { type: String, default: "" }     // Additional details
});

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, default: "",sparse: true },
  subject: { type: String, required: true },
  password: { type: String, required: true },
  
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  website: { type: String, default: "" },
  facebook: { type: String, default: "" },
  instagram: { type: String, default: "" },

  // අලුතින් එකතු කළ කොටස්
  profilePhoto: { type: String, default: "" }, // Unique ID / Filename එක සේව් වීමට
  qualifications: [qualificationSchema]        // අධ්‍යාපන සුදුසුකම් (Array එකක් ලෙස)
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);