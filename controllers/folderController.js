// controllers/folderController.js
const Folder = require('../models/Folder');
const Material = require('../models/Material');

// Folder එකක් තුළ තිබෙන සියලුම මට්ටම්වල Sub-folder IDs (Nested Folders) සොයා ගන්නා Recursive Helper Function එක
// 1. Folder එකක සියලුම මට්ටම්වල Sub-folder IDs ලබා ගැනීම
const getAllSubFolderIds = async (folderId, teacherId) => {
  const subFolderIds = [];
  const visited = new Set([folderId.toString()]);
  const queue = [folderId];

  while (queue.length > 0) {
    const currentParentId = queue.shift();

    const directChildren = await Folder.find({
      parentFolderId: currentParentId,
      teacherId
    }).select('_id');

    for (const child of directChildren) {
      const childId = child._id.toString();

      // දැනටමත් පරීක්ෂා කර තිබේ නම් නැවත ඇතුළත් නොකරයි
      if (visited.has(childId)) continue;

      visited.add(childId);
      subFolderIds.push(child._id);

      // තවත් Sub-folders තිබේ නම් ඒවාද පරීක්ෂා කරයි
      queue.push(child._id);
    }
  }

  return subFolderIds;
};


// 2. Parent Folders වල Publish Status නැවත ගණනය කිරීම
const reevaluateAncestorFolders = async (folderId, teacherId) => {

  let currentId = folderId;

  while (currentId) {

    const folder = await Folder.findOne({
      _id: currentId,
      teacherId
    });

    if (!folder) break;

    // Folder එක තුළ සෘජුව ඇති Published Materials
    const directMaterials = await Material.find({
      folderId: folder._id,
      teacherId,
      isPublished: true,
      status: 'approved'
    }).select('classIds isFree');


    // Folder එක තුළ සෘජුව ඇති Published Sub-folders
    const directSubFolders = await Folder.find({
      parentFolderId: folder._id,
      teacherId,
      isPublished: true
    }).select('classIds isFree');


    // Published Classes එකතු කිරීම
    const activeClassIdSet = new Set();

    let isAnyFree = false;


    // Materials වල Class IDs සහ Free Status ලබා ගැනීම
    directMaterials.forEach(material => {

      if (material.isFree) {
        isAnyFree = true;
      }

      (material.classIds || []).forEach(classId => {
        activeClassIdSet.add(classId.toString());
      });

    });


    // Sub-folders වල Class IDs සහ Free Status ලබා ගැනීම
    directSubFolders.forEach(subFolder => {

      if (subFolder.isFree) {
        isAnyFree = true;
      }

      (subFolder.classIds || []).forEach(classId => {
        activeClassIdSet.add(classId.toString());
      });

    });


    // අවසාන Class IDs ලබා ගැනීම
    const newClassIds = Array.from(activeClassIdSet);

    const shouldBePublished =
      newClassIds.length > 0 || isAnyFree;


    // Parent Folder එකේ Status Update කිරීම
    folder.classIds = newClassIds;

    folder.isFree = isAnyFree;

    folder.isPublished = shouldBePublished;

    await folder.save();


    // ඊළඟ Parent Folder එකට යාම
    currentId = folder.parentFolderId;

  }

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

// 6. Folder එකක් Publish / Unpublish කිරීම
// Cascade Publishing + Parent Folder Navigation Support
const publishFolder = async (req, res) => {
  try {

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        message: 'Access denied.'
      });
    }
    const { classIds, isFree } = req.body;
    // ගුරුවරයාට අයත් Folder එක ලබා ගැනීම
    const folder = await Folder.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });
    if (!folder) {
      return res.status(404).json({
        message: 'Folder not found.'
      });
    }


    // තෝරාගත් Classes ලබා ගැනීම
    const selectedClassIds = Array.isArray(classIds)
      ? classIds
      : [];


    const freeAccess = Boolean(isFree);


    // Publish කළ යුතුද යන්න තීරණය කිරීම
    const isPublished =
      selectedClassIds.length > 0 || freeAccess;


    // --------------------------------------------------
    // 1. Selected Folder එකේ Publish Status Update කිරීම
    // --------------------------------------------------

    folder.classIds = selectedClassIds;

    folder.isPublished = isPublished;

    folder.isFree = freeAccess;

    await folder.save();


    // --------------------------------------------------
    // 2. සියලුම Nested Sub-folder IDs ලබා ගැනීම
    // --------------------------------------------------

    const allChildFolderIds = await getAllSubFolderIds(
      folder._id,
      req.user.id
    );


    // Selected Folder එක සහ සියලුම Sub-folders
    const targetFolderIds = [
      folder._id,
      ...allChildFolderIds
    ];


    // --------------------------------------------------
    // 3. සියලුම Sub-folders වල Publish Status Update කිරීම
    // --------------------------------------------------

    if (allChildFolderIds.length > 0) {

      await Folder.updateMany(

        {
          _id: { $in: allChildFolderIds },
          teacherId: req.user.id
        },

        {
          $set: {
            classIds: selectedClassIds,
            isPublished: isPublished,
            isFree: freeAccess
          }
        }

      );

    }


    // --------------------------------------------------
    // 4. Selected Folder එක තුළ සහ සියලුම
    // Nested Folders තුළ ඇති Approved Materials Publish කිරීම
    // --------------------------------------------------

    await Material.updateMany(

      {
        folderId: { $in: targetFolderIds },
        teacherId: req.user.id,
        status: 'approved'
      },

      {
        $set: {
          classIds: selectedClassIds,
          isPublished: isPublished,
          isFree: freeAccess
        }
      }

    );


    // --------------------------------------------------
    // 5. Parent Folder Hierarchy එක Update කිරීම
    //
    // Selected Folder එකට ඉහළින් ඇති Parent Folders
    // Student පැත්තේ Navigation සඳහා පමණක්
    // අවශ්‍ය Publish Status එක ලබා දෙයි.
    //
    // Parent Folder තුළ ඇති වෙනත් Sub-folders හෝ
    // Materials Publish නොකරයි.
    // --------------------------------------------------

    if (folder.parentFolderId) {

      await reevaluateAncestorFolders(
        folder.parentFolderId,
        req.user.id
      );

    }


    // --------------------------------------------------
    // 6. Updated Folder එක නැවත ලබා ගැනීම
    // --------------------------------------------------

    await folder.populate(
      'classIds',
      'grade customGradeName medium mode day startTime endTime'
    );


    // --------------------------------------------------
    // 7. Response
    // --------------------------------------------------

    res.json({

      message: isPublished

        ? 'Folder, all its sub-folders, and approved materials published successfully!'

        : 'Folder and its contents unpublished successfully!',

      folder

    });


  } catch (err) {

    console.error("Publish Folder Error:", err);

    res.status(500).json({
      message: err.message || 'Server error'
    });

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