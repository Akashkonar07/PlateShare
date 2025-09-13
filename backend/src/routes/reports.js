
const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const statisticsController = require("../controllers/statisticsController");

// Get home page statistics (public endpoint)
router.get("/home", statisticsController.getHomeStatistics);

// Get detailed statistics (admin only)
router.get("/detailed", authenticate, authorize(["Admin"]), statisticsController.getDetailedStatistics);

// Example route (keeping for compatibility)
router.get("/test", authenticate, authorize(["Admin"]), (req, res) => {
  res.json({ message: "Reports route works!" });
});

module.exports = router;
