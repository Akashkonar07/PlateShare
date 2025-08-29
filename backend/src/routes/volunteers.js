const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const volunteerController = require("../controllers/volunteerController");

// Get volunteer profile (points, level, achievements)
router.get("/profile", 
  authenticate, 
  authorize(["Volunteer"]), 
  volunteerController.getVolunteerProfile
);

// Get leaderboard
router.get("/leaderboard", 
  authenticate, 
  authorize(["Volunteer", "NGO", "Admin"]), 
  volunteerController.getLeaderboard
);

// Get achievements
router.get("/achievements", 
  authenticate, 
  authorize(["Volunteer"]), 
  volunteerController.getAchievements
);

// Update volunteer preferences
router.patch("/preferences", 
  authenticate, 
  authorize(["Volunteer"]), 
  volunteerController.updatePreferences
);

// Admin route to reset periodic points
router.post("/reset/:period", 
  authenticate, 
  authorize(["Admin"]), 
  volunteerController.resetPeriodicPoints
);

module.exports = router;
