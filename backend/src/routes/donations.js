const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const donationController = require("../controllers/donationController");
const multer = require("multer");

// Initialize multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// --- Helper function to verify middlewares/controllers ---
const assertFunction = (fn, name) => {
  if (typeof fn !== "function") {
    throw new TypeError(`${name} must be a function`);
  }
};

// Check all middlewares and handlers
assertFunction(authenticate, "authenticate");
assertFunction(authorize(["Donor"]), "authorize(['Donor'])");
assertFunction(donationController.createDonation, "donationController.createDonation");
assertFunction(donationController.getMyDonations, "donationController.getMyDonations");
assertFunction(donationController.getAssignedDonations, "donationController.getAssignedDonations");
assertFunction(donationController.getAllDonations, "donationController.getAllDonations");
assertFunction(donationController.acceptDonation, "donationController.acceptDonation");
assertFunction(donationController.confirmPickup, "donationController.confirmPickup");
assertFunction(donationController.confirmNGOPickup, "donationController.confirmNGOPickup");
assertFunction(donationController.confirmDelivery, "donationController.confirmDelivery");
assertFunction(donationController.confirmNGODelivery, "donationController.confirmNGODelivery");
assertFunction(donationController.declineDonation, "donationController.declineDonation");
assertFunction(donationController.getDonationTracking, "donationController.getDonationTracking");
assertFunction(donationController.updateDonationStatus, "donationController.updateDonationStatus");
assertFunction(donationController.confirmAssignment, "donationController.confirmAssignment");
assertFunction(donationController.assignToNGO, "donationController.assignToNGO");

// --- Routes ---

// Donor creates a donation
router.post(
  "/",
  authenticate,
  authorize(["Donor"]),
  upload.single("photo"),
  donationController.createDonation
);

// Donor views their own donations
router.get(
  "/me",
  authenticate,
  authorize(["Donor"]),
  donationController.getMyDonations
);

// Volunteer/NGO views assigned donations
router.get(
  "/assigned",
  authenticate,
  authorize(["Volunteer", "NGO"]),
  donationController.getAssignedDonations
);

// Get all donations (for volunteers/NGOs to browse)
router.get(
  "/",
  authenticate,
  authorize(["Volunteer", "NGO", "Admin"]),
  donationController.getAllDonations
);

// Volunteer/NGO accepts a donation
router.post(
  "/:donationId/accept",
  authenticate,
  authorize(["Volunteer", "NGO"]),
  donationController.acceptDonation
);

// Volunteer confirms pickup
router.post(
  "/:donationId/pickup",
  authenticate,
  authorize(["Volunteer"]),
  upload.single('photo'),
  donationController.confirmPickup
);

// NGO confirms pickup (no photo required)
router.post(
  "/:donationId/ngo-pickup",
  authenticate,
  authorize(["NGO"]),
  donationController.confirmNGOPickup
);

// NGO confirms delivery with photo and recipient details
router.post(
  "/:donationId/ngo-deliver",
  authenticate,
  authorize(["NGO"]),
  (req, res, next) => {
    console.log('Processing NGO delivery request...');
    
    // Log request info for debugging
    console.log('Request info:', {
      method: req.method,
      url: req.originalUrl,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasBody: !!req.body,
      hasFiles: !!req.files,
      bodyFields: req.body ? Object.keys(req.body) : []
    });
    
    // Create a custom error handler for multer
    const handleMulterError = (err) => {
      console.error('Multer error:', {
        message: err.message,
        code: err.code,
        field: err.field,
        storageErrors: err.storageErrors,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
      
      let errorMessage = 'Error processing file upload';
      let statusCode = 400;
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'File size too large. Maximum size is 10MB.';
          statusCode = 413; // Payload Too Large
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = `Unexpected file field. Expected file field named 'deliveryPhoto' but got '${err.field}'`;
          break;
        case 'LIMIT_FILE_COUNT':
          errorMessage = 'Too many files uploaded. Only one file is allowed.';
          break;
        case 'LIMIT_FIELD_KEY':
          errorMessage = 'Field name too long';
          break;
        case 'LIMIT_FIELD_VALUE':
          errorMessage = 'Field value too long';
          break;
        case 'LIMIT_FIELD_COUNT':
          errorMessage = 'Too many fields';
          break;
        case 'LIMIT_PART_COUNT':
          errorMessage = 'Too many parts in the multipart request';
          break;
        default:
          if (err.message.includes('image')) {
            errorMessage = 'Only image files are allowed (JPG, JPEG, PNG)';
          }
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        code: err.code
      });
    };
    
    // Use multer to handle the file upload
    const multerUpload = upload.single('deliveryPhoto');
    
    multerUpload(req, res, function(err) {
      if (err) {
        return handleMulterError(err);
      }
      
      // Log upload result
      console.log('File upload result:', {
        file: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          destination: req.file.destination,
          filename: req.file.filename,
          path: req.file.path
        } : null,
        body: req.body ? {
          ...req.body,
          // Don't log sensitive data
          password: req.body.password ? '***' : undefined
        } : null
      });
      
      // Validate required fields
      const { recipientName, recipientType } = req.body;
      
      // Check if file was uploaded
      if (!req.file) {
        console.error('No file uploaded with request');
        return res.status(400).json({ 
          success: false, 
          message: 'Delivery photo is required',
          code: 'MISSING_FILE'
        });
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        // Clean up the uploaded file
        require('fs').unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error cleaning up invalid file:', unlinkErr);
        });
        
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPG, JPEG, and PNG images are allowed.',
          code: 'INVALID_FILE_TYPE'
        });
      }
      
      // Validate required fields
      if (!recipientName || !recipientType) {
        // Clean up the uploaded file since validation failed
        require('fs').unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error cleaning up file after validation failed:', unlinkErr);
        });
        
        return res.status(400).json({
          success: false,
          message: 'Recipient name and type are required',
          code: 'MISSING_REQUIRED_FIELDS',
          required: ['recipientName', 'recipientType']
        });
      }
      
      // Add additional validation for recipientType if needed
      const validRecipientTypes = ['Individual', 'Organization', 'Shelter', 'Other'];
      if (!validRecipientTypes.includes(recipientType)) {
        // Clean up the uploaded file since validation failed
        require('fs').unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error cleaning up file after validation failed:', unlinkErr);
        });
        
        return res.status(400).json({
          success: false,
          message: `Invalid recipient type. Must be one of: ${validRecipientTypes.join(', ')}`,
          code: 'INVALID_RECIPIENT_TYPE',
          validTypes: validRecipientTypes
        });
      }
      
      // All validations passed, proceed to controller
      next();
    });
  },
  async (req, res, next) => {
    try {
      console.log('Processing NGO delivery in controller...');
      await donationController.confirmNGODelivery(req, res, next);
    } catch (error) {
      console.error('Error in NGO delivery confirmation route:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          bufferLength: req.file.buffer?.length
        } : 'No file',
        error: {
          ...error,
          name: error.name,
          code: error.code,
          statusCode: error.statusCode
        }
      });
      
      const statusCode = error.statusCode || 500;
      const errorMessage = statusCode === 500 
        ? 'Internal server error during NGO delivery confirmation'
        : error.message;
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delivery confirmation (Volunteer/NGO marks delivery as complete)
router.post(
  "/:id/deliver",
  (req, res, next) => {
    console.log('Delivery confirmation request received');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files || 'No files');
    next();
  },
  authenticate,
  authorize(["Volunteer", "NGO"]),
  upload.single("deliveryPhoto"),
  (req, res, next) => {
    console.log('After file upload middleware');
    console.log('File info:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? `Buffer of ${req.file.buffer.length} bytes` : 'No buffer'
    } : 'No file uploaded');
    
    // Validate required fields
    const { recipientName, recipientType, recipientContact, numberOfPeopleServed } = req.body;
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Delivery photo is required' 
      });
    }
    
    if (!recipientName || !recipientType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient name and type are required' 
      });
    }
    
    next();
  },
  async (req, res, next) => {
    try {
      await donationController.confirmDelivery(req, res, next);
    } catch (error) {
      console.error('Error in delivery confirmation route:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        } : 'No file'
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error during delivery confirmation',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      });
    }
  }
);

// Volunteer/NGO declines a donation
router.post(
  "/:donationId/decline",
  authenticate,
  authorize(["Volunteer", "NGO"]),
  donationController.declineDonation
);

// Get donation tracking history
router.get(
  "/:donationId/tracking",
  authenticate,
  authorize(["Donor", "Volunteer", "NGO", "Admin"]),
  donationController.getDonationTracking
);

// Update donation status (general endpoint)
router.patch(
  "/:donationId/status",
  authenticate,
  authorize(["Volunteer", "NGO", "Admin"]),
  donationController.updateDonationStatus
);

// NGO confirms auto-assignment
router.post(
  "/:donationId/confirm-assignment",
  authenticate,
  authorize(["NGO"]),
  donationController.confirmAssignment
);

// Assign donation to NGO
router.post(
  "/:donationId/assign-ngo",
  authenticate,
  authorize(["NGO"]),
  donationController.assignToNGO
);

module.exports = router;
