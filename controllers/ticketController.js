const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');

// 1. ගුරුවරයෙකු අලුත් Ticket එකක් සෑදීම
const createTicket = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can create tickets.' });
    
    const { title, description } = req.body;
    const newTicket = new Ticket({
      teacherId: req.user.id,
      title,
      description
    });
    
    await newTicket.save();
    res.status(201).json({ message: 'Ticket created successfully!', ticket: newTicket });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. ගුරුවරයෙකුගේ තමන්ගේ Tickets ලබා ගැනීම
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ teacherId: req.user.id }).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. Admin ට සියලුම Tickets බලා ගැනීම (ගුරුවරයාගේ විස්තර ද සමඟ)
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

// 4. Ticket එකකට Reply කිරීම (Teacher සහ Admin දෙගොල්ලන්ටම හැක)
const replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    ticket.replies.push({
      senderRole: req.user.role,
      senderId: req.user.id,
      message
    });

    await ticket.save();

    // Admin Reply කළොත් Teacher ට යැවීම
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
      io.to(ticket.teacherId.toString()).emit("receive_notification", newNotif);
    } 
    // Teacher Reply කළොත් Admin ට යැවීම
    else if (req.user.role === 'teacher') {
      const newNotif = new Notification({
        recipientRole: 'admin',
        title: "New Ticket Reply",
        message: `Teacher replied to the ticket: "${ticket.title}"`
      });
      await newNotif.save();

      const io = req.app.get("io");
      io.to("admin_room").emit("receive_admin_notification", newNotif);
    }

    res.json({ message: 'Reply added!', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 5. Admin විසින් Ticket එක Close කිරීම
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

// 6. Admin විසින් Ticket එක මකා දැමීම
const deleteTicketAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted successfully' });
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