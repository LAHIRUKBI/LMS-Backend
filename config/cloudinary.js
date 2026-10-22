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
    // 1. If it's a profile photo...
    if (file.fieldname === 'profilePhoto') {
      return {
        folder: 'lms_profiles',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `teacher-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }
 
    // 2. If it is a profile image of the student
    if (file.fieldname === 'profileImage') {
      return {
        folder: 'lms_student_profiles',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `student-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 3. For Quiz Question Images (questionImage_0, questionImage_1 ...)
    if (file.fieldname.startsWith('questionImage_')) {
      return {
        folder: 'lms_quizzes',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `quiz-q-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 4. Advertisement Images (images)
    if (file.fieldname === 'images') {
      return {
        folder: 'lms_ads_images',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `ad-img-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 5. Advertisement Video (video)
    if (file.fieldname === 'video') {
      return {
        folder: 'lms_ads_videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
        public_id: `ad-vid-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 6. Class Cover Photo (coverImage)
    if (file.fieldname === 'coverImage') {
      return {
        folder: 'lms_class_covers',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `class-cover-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 6. If it is a PDF or a paper document
    const isPdf = file.mimetype === 'application/pdf';
    if (isPdf) {
      return {
        folder: 'lms_pdfs',
        resource_type: 'image',
        format: 'pdf',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 7. If it’s the admin’s profile photo...
    if (file.fieldname === 'profilePhoto' && req.baseUrl && req.baseUrl.includes('admin')) {
      return {
        folder: 'lms_admin_profiles',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `admin-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
      };
    }

    // 8. If it is a cover image or other images
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