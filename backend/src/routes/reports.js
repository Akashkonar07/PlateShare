const express = require("express");
const router = express.Router();

// Example middleware
const { authenticate, authorize } = require("../middleware/auth");

// Example route
router.get("/test", authenticate, authorize(["Admin"]), (req, res) => {
  res.json({ message: "Reports route works!" });
});

// TODO: Add report generation routes here

module.exports = router;
