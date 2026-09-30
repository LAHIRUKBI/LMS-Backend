const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  getPublishedFAQs, getAllAdminFAQs, createFAQ, 
  sendEmailToAdmins, publishFAQMessage, deleteFAQ , getPublicAdminsList
} = require('../controllers/faqController');

router.get('/', getPublishedFAQs); // සිසුන් සඳහා published පමණයි
router.get('/admin-all', authMiddleware, getAllAdminFAQs); // ඇඩ්මින් සඳහා සියල්ල
router.post('/add', authMiddleware, createFAQ);
router.post('/send-email', sendEmailToAdmins);
router.put('/:id/publish', authMiddleware, publishFAQMessage);
router.delete('/:id', authMiddleware, deleteFAQ);
router.get('/public-admins', getPublicAdminsList);

module.exports = router;