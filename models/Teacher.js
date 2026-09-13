const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  password: { type: String, required: true },
  
  // අලුතින් එකතු කළ කොටස් (අවශ්‍ය නම් පමණක් පිරවිය හැකි ලෙස)
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  website: { type: String, default: "" },
  facebook: { type: String, default: "" },
  instagram: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);