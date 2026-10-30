// routes/folderRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMyFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveMaterialToFolder,
  publishFolder,
  getFoldersByClass,
  getFreeFoldersForPublic
} = require('../controllers/folderController');

// Teacher Folder Routes
router.get('/my-folders', authMiddleware, getMyFolders);
router.post('/create', authMiddleware, createFolder);
router.put('/:id/rename', authMiddleware, renameFolder);
router.delete('/:id', authMiddleware, deleteFolder);
router.put('/move-material/:materialId', authMiddleware, moveMaterialToFolder);
router.put('/:id/publish', authMiddleware, publishFolder);

// Student / Public Folder Routes
router.get('/class/:classId', authMiddleware, getFoldersByClass);
router.get('/free/all', getFreeFoldersForPublic);

module.exports = router;