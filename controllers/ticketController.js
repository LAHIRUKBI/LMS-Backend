const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');

// 1. Sending a notification to the Admin when a teacher creates a new ticket.
const createTicket = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can create tickets.' });
    
    const { title, description } = req.body;
    let attachmentUrl = null;
    let attachmentType = null;

    if (req.file) {
      attachmentUrl = `/All_images/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        attachmentType = 'image';
      } else {
        attachmentType = 'document';
      }
    }

    const newTicket = new Ticket({
      teacherId: req.user.id,
      title,
      description,
      attachmentUrl,
      attachmentType
    });
    
    await newTicket.save();

    const newNotif = new Notification({
      recipientRole: 'admin',
      ticketId: newTicket._id,
      title: "New Support Ticket",
      message: `Teacher opened a new ticket: "${newTicket.title}"`
    });
    await newNotif.save();

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("receive_admin_notification", newNotif);
    }

    res.status(201).json({ message: 'Ticket created successfully!', ticket: newTicket });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. A teacher obtaining their own tickets
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ teacherId: req.user.id }).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. Admin can view all tickets (including teacher details).
const getAllTicketsAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    
    const tickets = await Ticket.find()
      .populate('teacherId', 'name email profilePhoto teacherId')
      .sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 4. Replying to a ticket (Both teachers and admins can do this)
const replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    let attachmentUrl = null;
    let attachmentType = null;

    if (req.file) {
      attachmentUrl = `/All_images/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        attachmentType = 'image';
      } else {
        attachmentType = 'document';
      }
    }

    ticket.replies.push({
      senderRole: req.user.role,
      senderId: req.user.id,
      message,
      attachmentUrl,
      attachmentType
    });

    await ticket.save();

    if (req.user.role === 'admin') {
      const newNotif = new Notification({
        userId: ticket.teacherId,
        recipientRole: 'teacher',
        ticketId: ticket._id,
        title: "New Ticket Reply",
        message: `Admin replied to your ticket: "${ticket.title}"`
      });
      await newNotif.save();

      const io = req.app.get("io");
      if(io) io.to(ticket.teacherId.toString()).emit("receive_notification", newNotif);
    } 
    else if (req.user.role === 'teacher') {
      const newNotif = new Notification({
        recipientRole: 'admin',
        title: "New Ticket Reply",
        message: `Teacher replied to the ticket: "${ticket.title}"`
      });
      await newNotif.save();

      const io = req.app.get("io");
      if(io) io.to("admin_room").emit("receive_admin_notification", newNotif);
    }

    res.json({ message: 'Reply added!', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 5. Closing the ticket by the admin
const closeTicketAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    res.json({ message: 'Ticket closed successfully', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 6. Deletion of the ticket by the admin
const deleteTicketAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Remove main ticket attachment if exists
    if (ticket.attachmentUrl) {
      const filePath = path.join(__dirname, '..', ticket.attachmentUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove replies attachments if exist
    if (ticket.replies && ticket.replies.length > 0) {
      ticket.replies.forEach(reply => {
        if (reply.attachmentUrl) {
          const replyFilePath = path.join(__dirname, '..', reply.attachmentUrl);
          if (fs.existsSync(replyFilePath)) {
            fs.unlinkSync(replyFilePath);
          }
        }
      });
    }

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket and associated files deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTicketsAdmin,
  replyToTicket,
  closeTicketAdmin,
  deleteTicketAdmin
};