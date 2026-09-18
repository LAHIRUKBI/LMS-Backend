const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Material = require('../models/Material');
const authMiddleware = require('../middleware/authMiddleware');

// 'uploads' folder එක නැත්නම් එය ස්වයංක්‍රීයව සෑදීම
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Files සේව් වෙන folder එක
  },
  filename: function (req, file, cb) {
    // එකම නමින් files ආවොත් overwrite වෙන එක වලක්වන්න අගට Date එකක් දානවා
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ storage: storage });

// 1. File Upload API එක
// upload.single('file') මගින් Frontend එකෙන් එවන 'file' කියන දත්තය ලබාගනී
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. ගුරුවරුන්ට පමණක් Files Upload කළ හැක.' });
    }

    // අලුත් fields (grade, description) request body එකෙන් ලබාගැනීම
    const { title, type, subject, grade, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'කරුණාකර File එකක් ඇතුළත් කරන්න.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const newMaterial = new Material({
      title,
      type,
      subject,
      grade,         // අලුතින් එකතු කරන ලදි
      description,   // අලුතින් එකතු කරන ලදි
      fileUrl,
      teacherId: req.user.id
    });

    await newMaterial.save();
    res.status(201).json({ message: 'Document uploaded successfully!', material: newMaterial });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 2. තමන් Upload කළ පාඩම් බලාගැනීමේ API එක
router.get('/my-materials', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    // අදාළ ගුරුවරයාගේ පමණක් පාඩම් ලබා ගැනීම
    const materials = await Material.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 3. Upload කළ පාඩමක් ඉවත් කිරීමේ (Delete) API එක
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    // මකා දැමීමට අවශ්‍ය පාඩමේ විස්තර ලබා ගැනීම
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'මෙම පාඩම සොයාගත නොහැක.' });
    }

    // වෙනත් ගුරුවරයෙකුගේ පාඩමක් මකා දැමීම වැළැක්වීම
    if (material.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. ඔබට ඉවත් කළ හැක්කේ ඔබගේ පාඩම් පමණි.' });
    }

    // Server එකේ 'uploads' folder එකෙන් සැබෑ File එක මකා දැමීම
    const filePath = path.join(__dirname, '..', material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // File එක මකා දමයි
    }

    // Database එකෙන් දත්තය මකා දැමීම
    await Material.findByIdAndDelete(req.params.id);

    res.json({ message: 'පාඩම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Admin ට සියලුම පාඩම් (ගුරුවරයාගේ විස්තර ද සමඟ) ලබා ගැනීම
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    // populate('teacherId', ...) හරහා Material එක upload කළ ගුරුවරයාගේ නම, email එක ලබා ගනී
    const materials = await Material.find()
      .populate('teacherId', 'name email teacherId')
      .sort({ createdAt: -1 });
      
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Admin ට පාඩමක Status එක (Approve/Reject) වෙනස් කිරීම
router.put('/admin/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const { status, rejectReason } = req.body;

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      { status, rejectReason: rejectReason || "" },
      { new: true }
    );

    if (!updatedMaterial) return res.status(404).json({ message: 'පාඩම සොයාගත නොහැක.' });

    res.json({ message: `පාඩම සාර්ථකව ${status} කරන ලදී.`, material: updatedMaterial });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;