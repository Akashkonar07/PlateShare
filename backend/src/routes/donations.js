const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const donationController = require("../controllers/donationController");
const multer = require("multer");

// Setup multer for file uploads
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
assertFunction(donationController.acceptDonation, "donationController.acceptDonation");
assertFunction(donationController.confirmDelivery, "donationController.confirmDelivery");
assertFunction(donationController.declineDonation, "donationController.declineDonation");

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

// Volunteer/NGO confirms pickup
router.post(
  "/:donationId/pickup",
  authenticate,
  authorize(["Volunteer", "NGO"]),
  upload.single('photo'),
  donationController.confirmPickup
);

// Delivery confirmation (Volunteer marks delivery as complete)
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
  authorize(["Volunteer"]),
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
