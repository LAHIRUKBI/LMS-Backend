const FAQ = require('../models/FAQ');
const Admin = require('../models/Admin');
const nodemailer = require('nodemailer');

// 1. Student Side එකට පෙන්වන්නේ isPublished: true වන FAQs පමණි
const getPublishedFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ isPublished: true }).sort({ createdAt: -1 });
    res.json(faqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. Admin Side එකට සියලුම (Published සහ Unpublished/Student Messages) ලබා ගැනීම
const getAllAdminFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.json(faqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Admin කෙනෙකු විසින් නව FAQ එකක් සෘජුව එකතු කිරීම
const createFAQ = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required.' });
    }

    const newFAQ = new FAQ({ 
      question, 
      answer, 
      isPublished: true 
    });
    await newFAQ.save();
    res.status(201).json({ message: 'FAQ added successfully!', newFAQ });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 4. Student කෙනෙකු විසින් Send Message කිරීම (isPublished: false ලෙස Save වේ)
const sendEmailToAdmins = async (req, res) => {
  try {
    const { name, senderEmail, subject, description, selectedAdminId } = req.body;

    // FAQ model එකම භාවිතා කරමින් student message එක save කිරීම
    const studentFAQMsg = new FAQ({
      question: subject,
      answer: description,
      isPublished: false, // තවම admin post කර නැත
      studentName: name,
      studentEmail: senderEmail
    });
    await studentFAQMsg.save();

    // Admin ඊමේල් යැවීම
    let adminsQuery = {};
    if (selectedAdminId) {
      adminsQuery._id = selectedAdminId;
    }
    const admins = await Admin.find(adminsQuery).select('email name');

    if (admins && admins.length > 0) {
      const adminEmails = admins.map(admin => admin.email).filter(Boolean);

      if (adminEmails.length > 0) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const mailOptions = {
          from: senderEmail,
          to: adminEmails,
          subject: `[LMS Student Inquiry] ${subject}`,
          html: `
            <h3>New Student Inquiry</h3>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${senderEmail}</p>
            <p><b>Subject:</b> ${subject}</p>
            <p><b>Message:</b></p>
            <p>${description}</p>
          `
        };

        await transporter.sendMail(mailOptions).catch(err => console.log("Email error:", err.message));
      }
    }

    res.json({ message: 'Message sent successfully!' });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: 'Failed to send message.' });
  }
};

// 5. Admin විසින් Student Message එකට Reply එකක් ලියා 'Post' කිරීම (answer යාවත්කාලීන කර isPublished: true කිරීම)
const publishFAQMessage = async (req, res) => {
  try {
    const faqId = req.params.id;
    const { answer } = req.body; // ඇඩ්මින් ලියූ Reply එක ලබා ගැනීම

    const updateData = { isPublished: true };
    if (answer && answer.trim() !== "") {
      updateData.answer = answer.trim(); // ඇඩ්මින් Reply එක දී ඇත්නම් එය answer එක ලෙස save වේ
    }

    const updatedFAQ = await FAQ.findByIdAndUpdate(
      faqId, 
      updateData, 
      { new: true }
    );

    if (!updatedFAQ) return res.status(404).json({ message: 'Item not found.' });

    res.json({ message: 'Reply and message successfully posted to FAQs!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 6. FAQ එකක් ඉවත් කිරීම
const deleteFAQ = async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// සිසුන් සඳහා පද්ධතියේ සිටින ඇඩ්මින්වරුන්ගේ නම සහ Profile Photo පමණක් ලබා දීම (Public)
const getPublicAdminsList = async (req, res) => {
  try {
    const admins = await Admin.find().select('name email profilePhoto').sort({ createdAt: 1 });
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getPublishedFAQs,
  getAllAdminFAQs,
  createFAQ,
  sendEmailToAdmins,
  publishFAQMessage,
  deleteFAQ,
  getPublicAdminsList
};