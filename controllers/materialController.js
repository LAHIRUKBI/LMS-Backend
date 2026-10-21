const Material = require('../models/Material');
const { cloudinary } = require('../config/cloudinary');


// Helper function to extract the Video ID from a YouTube URL
const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
};




// 1. Material Upload API (Video / PDF / Paper)
const uploadMaterial = async (req, res) => {
  try {
    // 1. User authentication and role verification
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied. Only teachers can enter data.' });
    }
    const { title, type, subject, grade, description, youtubeUrl } = req.body;

    let finalFileUrl = "";
    let finalFilePublicId = "";
    let extractedVideoId = "";

    // A. If the material is of a video type (YouTube URL check)
    if (type === 'video') {
      if (!youtubeUrl) {
        return res.status(400).json({ message: 'Please include a YouTube link.' });
      }
      // Universal YouTube Regex
      const regExp = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = youtubeUrl.trim().match(regExp);
      extractedVideoId = match ? match[1] : null;

      if (!extractedVideoId) {
        return res.status(400).json({ message: 'Please provide a valid YouTube link.' });
      }
      finalFileUrl = youtubeUrl.trim();
    } 
    // B. If the material is in PDF or paper format (Cloudinary files check)
    else if (type === 'pdf' || type === 'paper') {
      if (!req.files || !req.files['file'] || req.files['file'].length === 0) {
        return res.status(400).json({ message: 'Please upload a PDF file.' });
      }
      const pdfFile = req.files['file'][0];
      finalFileUrl = pdfFile.path;          // Cloudinary URL
      finalFilePublicId = pdfFile.filename; // Cloudinary Public ID
    } else {
      return res.status(400).json({ message: 'Select a valid Material Type.' });
    }
    // If there is a cover image (Cloudinary Image)
    let coverImageData = { url: "", publicId: "" };
    if (req.files && req.files['coverImage'] && req.files['coverImage'].length > 0) {
      const coverFile = req.files['coverImage'][0];
      coverImageData = {
        url: coverFile.path,
        publicId: coverFile.filename
      };
    }
    // Saving to the database
    const newMaterial = new Material({
      title,
      type,
      subject,
      grade,
      description: description || "",
      fileUrl: finalFileUrl,
      filePublicId: finalFilePublicId,
      youtubeVideoId: extractedVideoId,
      coverImage: coverImageData,
      teacherId: req.user.id || req.user._id
    });

    await newMaterial.save();
    return res.status(201).json({ message: 'The material was successfully added!', material: newMaterial });

  } catch (err) {
    console.error("Upload Material Error:", err);
    return res.status(500).json({ message: err.message || 'Server Error' });
  }
};



// 2. API for viewing the lessons one has uploaded
const getMyMaterials = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const materials = await Material.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



// 3. API for Deleting an Uploaded Lesson (Teacher)
const deleteMyMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied. You do not have permission.' });
    }
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'This lesson cannot be found.' });
    }
    if (material.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Permission denied. You can only remove your own lessons.' });
    }
    // 1. Deleting the cover image from Cloudinary (Default: image)
    if (material.coverImage && material.coverImage.publicId) {
      await cloudinary.uploader.destroy(material.coverImage.publicId, { resource_type: 'image' });
    }
    // 2. Deleting the PDF file from Cloudinary
    if (material.filePublicId) {
      // Ensuring that the PDF is deleted in both cases—whether it exists as an 'image' or as 'raw' data:
      try {
        // Attempting to delete it as an 'image' resource type first
        const result = await cloudinary.uploader.destroy(material.filePublicId, { resource_type: 'image' });
        
        // Deleting as a 'raw' resource type if not found as an 'Image'
        if (result.result !== 'ok') {
          await cloudinary.uploader.destroy(material.filePublicId, { resource_type: 'raw' });
        }
      } catch (err) {
        // Fallback: Deleting as raw
        await cloudinary.uploader.destroy(material.filePublicId, { resource_type: 'raw' });
      }
    }

    // 3. Removing a record from the database
    await Material.findByIdAndDelete(req.params.id);

    return res.json({ message: 'The lesson and relevant files were successfully removed from Cloudinary.' });

  } catch (err) {
    console.error("Delete Error:", err.message);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
};



// 4. Publish a material to selected classes or as Free (Teacher Only)
const publishMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Only teachers can publish.' });
    }

    const { classIds, isFree } = req.body;
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found.' });

    if (material.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only publish your own materials.' });
    }

    if (material.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved materials can be published.' });
    }

    const hasClasses = classIds && Array.isArray(classIds) && classIds.length > 0;
    
    if (hasClasses || isFree) {
      material.classIds = hasClasses ? classIds : [];
      material.isPublished = true;
      material.isFree = !!isFree;
    } else {
      material.classIds = [];
      material.isPublished = false;
      material.isFree = false;
    }

    await material.save();
    await material.populate('classIds', 'grade medium mode day startTime endTime');

    res.json({ message: 'Material published successfully!', material });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



// 5. Accessing all lessons for the Admin
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



// 6. Changing the status (Approve/Reject) of a lesson by the Admin
const updateMaterialStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { status, rejectReason } = req.body;

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      { status, rejectReason: rejectReason || "" },
      { new: true }
    );

    if (!updatedMaterial) return res.status(404).json({ message: 'The lesson cannot be found.' });

    res.json({ message: `Lesson successfully ${status}.`, material: updatedMaterial });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



// 7. Admin deletes a lesson API
const deleteMaterialAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied. For admins only.' });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'This lesson cannot be found.' });
    }

    // 1. Removing the PDF from Cloudinary
    if (material.filePublicId) {
      await cloudinary.uploader.destroy(material.filePublicId, { resource_type: 'raw' });
    }
    // 2. Removing the cover image from Cloudinary
    if (material.coverImage && material.coverImage.publicId) {
      await cloudinary.uploader.destroy(material.coverImage.publicId);
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: 'The lesson was successfully removed by the Admin.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



// 8. Accessing materials published for a class
const getMaterialsByClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const materials = await Material.find({ 
      classIds: classId, 
      isPublished: true, 
      status: 'approved' 
    }).populate('teacherId', 'name subject').sort({ createdAt: -1 });

    res.json(materials);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



// 9. Providing all approved lessons to students
const getStudentMaterials = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Permission denied.' });
    }
    
    const materials = await Material.find({ status: 'approved' })
      .populate('teacherId', 'name subject')
      .sort({ createdAt: -1 });
      
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



// 10. Get free materials
const getFreeMaterialsForPublic = async (req, res) => {
  try {
    const materials = await Material.find({ isFree: true, status: 'approved' })
      .populate('teacherId', 'name subject')
      .sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


// --- New Material Tracking Functions ---

const getNewMaterialCount = async (req, res) => {
  try {
    const count = await Material.countDocuments({ isNewForSidebar: true });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

const clearMaterialSidebarBadge = async (req, res) => {
  try {
    await Material.updateMany({ isNewForSidebar: true }, { isNewForSidebar: false });
    res.json({ message: 'Sidebar badge cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



const clearMaterialCardDot = async (req, res) => {
  try {
    await Material.findByIdAndUpdate(req.params.id, { isNewForTable: false });
    res.json({ message: 'Material card dot cleared' });
  } catch (err) {
    console.error(err);
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
  deleteMaterialAdmin,
  getMaterialsByClass,
  getStudentMaterials,
  getNewMaterialCount,
  clearMaterialSidebarBadge,
  clearMaterialCardDot,
  getFreeMaterialsForPublic
};