// models/PhysicalMark.js
const mongoose = require('mongoose');

const physicalMarkSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // ගුරුවරයාගේ MongoDB ID එක
teacherId: {
  type: String,
  default: null,
  index: true
},

// ලකුණු ඇතුළත් කළ ගුරුවරයාගේ නම
teacherName: {
  type: String,
  trim: true,
  default: ''
},
  instituteName: {
    type: String,
    required: false,
    default: ''
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  indexNumber: {
    type: String,
    required: true,
    trim: true
  },
  subjectName: {
    type: String,
    required: false,
    default: ''
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  marks: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'S', 'F'],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('PhysicalMark', physicalMarkSchema);