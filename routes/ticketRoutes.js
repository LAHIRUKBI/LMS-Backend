const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

const {createTicket,getMyTickets,getAllTicketsAdmin,replyToTicket,closeTicketAdmin,deleteTicketAdmin} = require('../controllers/ticketController');

// Multer storage setup for All_images folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../All_images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- Teacher Routes ---
router.post('/', authMiddleware, upload.single('attachment'), createTicket);
router.get('/my-tickets', authMiddleware, getMyTickets);

// --- Admin Routes ---
router.get('/admin/all', authMiddleware, getAllTicketsAdmin);
router.put('/admin/:id/close', authMiddleware, closeTicketAdmin);
router.delete('/admin/:id', authMiddleware, deleteTicketAdmin);

// --- Shared (Admin & Teacher) Routes ---
router.post('/:id/reply', authMiddleware, upload.single('attachment'), replyToTicket);

module.exports = router;