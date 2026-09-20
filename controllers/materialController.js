const path = require('path');
const fs = require('fs');
const Material = require('../models/Material');

// 1. File Upload API එක
const uploadMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. ගුරුවරුන්ට පමණක් Files Upload කළ හැක.' });
    }

    const { title, type, subject, grade, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'කරුණාකර File එකක් ඇතුළත් කරන්න.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const newMaterial = new Material({
      title,
      type,
      subject,
      grade,
      description,
      fileUrl,
      teacherId: req.user.id
    });

    await newMaterial.save();
    res.status(201).json({ message: 'Document uploaded successfully!', material: newMaterial });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 2. තමන් Upload කළ පාඩම් බලාගැනීමේ API එක
const getMyMaterials = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const materials = await Material.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 3. Upload කළ පාඩමක් ඉවත් කිරීමේ (Delete) API එක
const deleteMyMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'මෙම පාඩම සොයාගත නොහැක.' });
    }

    if (material.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. ඔබට ඉවත් කළ හැක්කේ ඔබගේ පාඩම් පමණි.' });
    }

    const filePath = path.join(__dirname, '..', material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: 'පාඩම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 4. Publish a material (Teacher Only)
const publishMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Only teachers can publish.' });
    }

    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found.' });

    if (material.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only publish your own materials.' });
    }

    if (material.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved materials can be published.' });
    }

    material.isPublished = true;
    await material.save();

    res.json({ message: 'Material published successfully!', material });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 5. Admin ට සියලුම පාඩම් ලබා ගැනීම
const getAllMaterialsAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const materials = await Material.find()
      .populate('teacherId', 'name email teacherId profilePhoto')
      .sort({ createdAt: -1 });
      
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 6. Admin ට පාඩමක Status එක (Approve/Reject) වෙනස් කිරීම
const updateMaterialStatus = async (req, res) => {
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
};

// 7. Admin විසින් පාඩමක් මකා දැමීමේ API එක
const deleteMaterialAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය. Admin වරුන්ට පමණි.' });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'මෙම පාඩම සොයාගත නොහැක.' });
    }

    const filePath = path.join(__dirname, '..', material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: 'පාඩම Admin විසින් සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  uploadMaterial,
  getMyMaterials,
  deleteMyMaterial,
  publishMaterial,
  getAllMaterialsAdmin,
  updateMaterialStatus,
  deleteMaterialAdmin
};