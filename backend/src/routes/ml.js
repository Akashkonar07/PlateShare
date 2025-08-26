// routes/ml.js
const express = require("express");
const router = express.Router();

// Optional middleware
const { authenticate, authorize } = require("../middleware/auth");

// Example test route
router.get("/test", authenticate, authorize(["Admin"]), (req, res) => {
  res.json({ message: "ML route works!" });
});

// TODO: Add your real ML endpoints here

module.exports = router; // ✅ Must export router
