// controllers/folderController.js
const Folder = require('../models/Folder');
const Material = require('../models/Material');

// Folder එකක් තුළ තිබෙන සියලුම මට්ටම්වල Sub-folder IDs (Nested Folders) සොයා ගන්නා Recursive Helper Function එක
const getAllSubFolderIds = async (folderId) => {
  let subFolderIds = [];
  const directChildren = await Folder.find({ parentFolderId: folderId });

  for (const child of directChildren) {
    subFolderIds.push(child._id);
    // Child folder එක ඇතුළත තවත් folders තිබේ නම් ඒවාද recursive ලෙස සොයා ගනී
    const grandChildren = await getAllSubFolderIds(child._id);
    subFolderIds = subFolderIds.concat(grandChildren);
  }

  return subFolderIds;
};

// 1. ගුරුවරයාගේ සියලුම Folders ලබා ගැනීම
const getMyFolders = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
    const folders = await Folder.find({ teacherId: req.user.id })
      .populate('classIds', 'grade customGradeName medium mode day startTime endTime')
      .sort({ name: 1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 2. Folder එකක් සෑදීම
const createFolder = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
    const { name, parentFolderId } = req.body;
    if (!name) return res.status(400).json({ message: 'Folder name is required.' });

    const newFolder = new Folder({
      name: name.trim(),
      teacherId: req.user.id,
      parentFolderId: parentFolderId || null
    });

    await newFolder.save();
    res.status(201).json({ message: 'Folder created successfully!', folder: newFolder });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 3. Folder එක Rename කිරීම
const renameFolder = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
    const { name } = req.body;
    const folder = await Folder.findOne({ _id: req.params.id, teacherId: req.user.id });
    if (!folder) return res.status(404).json({ message: 'Folder not found.' });

    folder.name = name.trim();
    await folder.save();
    res.json({ message: 'Folder renamed successfully!', folder });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 4. Folder එකක් මකා දැමීම
const deleteFolder = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
    const folderId = req.params.id;

    const folder = await Folder.findOne({ _id: folderId, teacherId: req.user.id });
    if (!folder) return res.status(404).json({ message: 'Folder not found.' });

    await Material.updateMany({ folderId }, { folderId: folder.parentFolderId || null });
    await Folder.updateMany({ parentFolderId: folderId }, { parentFolderId: folder.parentFolderId || null });

    await Folder.findByIdAndDelete(folderId);
    res.json({ message: 'Folder deleted. Contents were moved up successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 5. Material එකක් Folder එකකට Move කිරීම
const moveMaterialToFolder = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
    const { folderId } = req.body;
    const materialId = req.params.materialId;

    const material = await Material.findOne({ _id: materialId, teacherId: req.user.id });
    if (!material) return res.status(404).json({ message: 'Material not found.' });

    material.folderId = folderId || null;
    await material.save();
    res.json({ message: 'Material moved successfully!', material });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 6. Folder එකක් Publish / Unpublish කිරීම (Cascade Publish to inner materials)
const publishFolder = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { classIds, isFree } = req.body;
    const folder = await Folder.findOne({ _id: req.params.id, teacherId: req.user.id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const hasClasses = classIds && Array.isArray(classIds) && classIds.length > 0;
    const isPublished = Boolean(hasClasses || isFree);

    // 1. ප්‍රධාන (Root/Parent) Folder එකේ Status Update කිරීම
    folder.classIds = hasClasses ? classIds : [];
    folder.isPublished = isPublished;
    folder.isFree = Boolean(isFree);
    await folder.save();

    // 2. මෙම Folder එක තුළ ඇති සියලුම Sub-folders (Deep Nested Folders) සොයා ගැනීම
    const allChildFolderIds = await getAllSubFolderIds(folder._id);
    
    // ප්‍රධාන Folder එක සහ ඊට යටින් ඇති සියලුම Sub-folder IDs එකතු කර ගැනීම
    const targetFolderIds = [folder._id, ...allChildFolderIds];

    // 3. හමු වූ සියලුම Sub-folders වලටද Parent Folder එකේ Publish Status එක ලබා දීම
    if (allChildFolderIds.length > 0) {
      await Folder.updateMany(
        { _id: { $in: allChildFolderIds } },
        {
          $set: {
            classIds: folder.classIds,
            isPublished: folder.isPublished,
            isFree: folder.isFree
          }
        }
      );
    }

    // 4. ප්‍රධාන Folder එක සහ එහි සියලුම Sub-folders තුළ ඇති Approved Materials වලටද Publish Status එක ලබා දීම
    await Material.updateMany(
      { folderId: { $in: targetFolderIds }, status: 'approved' },
      {
        $set: {
          classIds: folder.classIds,
          isPublished: folder.isPublished,
          isFree: folder.isFree
        }
      }
    );

    await folder.populate('classIds', 'grade customGradeName medium mode day startTime endTime');
    
    res.json({ 
      message: isPublished 
        ? 'Folder, all its sub-folders, and materials published successfully!' 
        : 'Folder and its contents unpublished successfully!', 
      folder 
    });

  } catch (err) {
    console.error("Publish Folder Error:", err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 7. Student: Class එකට අදාළ Folders ලබා ගැනීම
const getFoldersByClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const folders = await Folder.find({
      classIds: classId,
      isPublished: true
    }).sort({ name: 1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// 8. Public / Student: Free Folders ලබා ගැනීම
const getFreeFoldersForPublic = async (req, res) => {
  try {
    const folders = await Folder.find({
      isFree: true,
      isPublished: true
    }).sort({ name: 1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = {
  getMyFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveMaterialToFolder,
  publishFolder,
  getFoldersByClass,
  getFreeFoldersForPublic
};