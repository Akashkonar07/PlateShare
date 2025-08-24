const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const donationController = require("../controllers/donationController");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Donor creates donation
router.post("/", authenticate, authorize(["Donor"]), upload.single("photo"), donationController.createDonation);

// Donor views their donations
router.get("/me", authenticate, authorize(["Donor"]), donationController.getMyDonations);

// Volunteer/NGO actions
router.get("/assigned", authenticate, authorize(["Volunteer","NGO"]), donationController.getAssignedDonations);
router.post("/:donationId/accept", authenticate, authorize(["Volunteer"]), donationController.acceptDonation);
router.post("/:donationId/deliver", authenticate, authorize(["Volunteer","NGO"]), donationController.confirmDelivery);
router.post("/:donationId/decline", authenticate, authorize(["Volunteer","NGO"]), donationController.declineDonation);

module.exports = router;
