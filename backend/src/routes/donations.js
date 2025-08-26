const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const donationController = require("../controllers/donationController");
const multer = require("multer");

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

// Volunteer accepts a donation
router.post(
  "/:donationId/accept",
  authenticate,
  authorize(["Volunteer"]),
  donationController.acceptDonation
);

// Volunteer/NGO confirms delivery
router.post(
  "/:donationId/deliver",
  authenticate,
  authorize(["Volunteer", "NGO"]),
  donationController.confirmDelivery
);

// Volunteer/NGO declines a donation
router.post(
  "/:donationId/decline",
  authenticate,
  authorize(["Volunteer", "NGO"]),
  donationController.declineDonation
);

module.exports = router;
