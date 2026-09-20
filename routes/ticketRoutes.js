const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {createTicket,getMyTickets,getAllTicketsAdmin,replyToTicket,closeTicketAdmin,deleteTicketAdmin} = require('../controllers/ticketController');

// --- Teacher Routes ---
router.post('/', authMiddleware, createTicket);
router.get('/my-tickets', authMiddleware, getMyTickets);

// --- Admin Routes ---
router.get('/admin/all', authMiddleware, getAllTicketsAdmin);
router.put('/admin/:id/close', authMiddleware, closeTicketAdmin);
router.delete('/admin/:id', authMiddleware, deleteTicketAdmin);

// --- Shared (Admin & Teacher) Routes ---
router.post('/:id/reply', authMiddleware, replyToTicket);

module.exports = router;