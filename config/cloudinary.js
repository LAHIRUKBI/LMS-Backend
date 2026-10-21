// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    
    // For a PDF, the format can be specified as 'pdf', and the resource_type as either 'image' or 'raw'.
    // For previewing a PDF within a browser via Cloudinary, using the 'image' resource type with `format: 'pdf'` is the most suitable approach.
    if (isPdf) {
      return {
        folder: 'lms_pdfs',
        resource_type: 'image', // Setting the type to 'image' for inline PDF preview in the browser via Cloudinary
        format: 'pdf',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    return {
      folder: 'lms_covers',
      resource_type: 'image',
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
    };
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = { cloudinary, upload };