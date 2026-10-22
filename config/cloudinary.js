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
    // 1. Profile photo එකක් නම්
    if (file.fieldname === 'profilePhoto') {
      return {
        folder: 'lms_profiles',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `teacher-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }
 
    // 2. ශිෂ්‍යයාගේ Profile Image එකක් නම්
    if (file.fieldname === 'profileImage') {
      return {
        folder: 'lms_student_profiles',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `student-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 3. Quiz Question Images සඳහා (questionImage_0, questionImage_1 ...)
    if (file.fieldname.startsWith('questionImage_')) {
      return {
        folder: 'lms_quizzes',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `quiz-q-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 4. PDF / Paper එකක් නම්
    const isPdf = file.mimetype === 'application/pdf';
    if (isPdf) {
      return {
        folder: 'lms_pdfs',
        resource_type: 'image',
        format: 'pdf',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 5. Cover Image හෝ වෙනත් Images නම්
    return {
      folder: 'lms_covers',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
    };

    
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = { cloudinary, upload };