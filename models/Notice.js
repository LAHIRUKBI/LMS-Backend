const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['all_students', 'grade_students', 'all_teachers', 'individual_student', 'individual_teacher', 'everyone'],
    required: true
  },
  targetGrades: [{
    type: String
  }],
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  targetTeachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }],
  image: {
    type: String,
    default: null
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);