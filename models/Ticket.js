// models/Ticket.js
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  senderRole: { type: String, enum: ['teacher', 'admin'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  replies: [replySchema]
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);