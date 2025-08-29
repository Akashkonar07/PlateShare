const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Validate required environment variables
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 60000, // 60 seconds timeout for all Cloudinary operations
  upload_preset: 'plateshare_uploads'
});

// Set up storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    console.log('Uploading file to Cloudinary:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    return {
      folder: 'plateshare/deliveries',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' } // Optimize image quality
      ],
      resource_type: 'auto',
      type: 'upload',
      invalidate: true // Force CDN invalidation
    };
  }
});

// Configure multer with better error handling
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedMimeTypes.join(', ')} are allowed.`), false);
    }
  }
});

// Test Cloudinary connection on startup
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful');
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    process.exit(1);
  }
};

testCloudinaryConnection();

module.exports = { cloudinary, upload };