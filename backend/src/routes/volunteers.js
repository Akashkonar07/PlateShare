const express = require("express");
const router = express.Router();

// Example middleware (optional)
const { authenticate, authorize } = require("../middleware/auth");

// Example route
router.get("/test", authenticate, authorize(["Volunteer"]), (req, res) => {
  res.json({ message: "Volunteers route works!" });
});

// TODO: Add real volunteer routes here (accept donation, view assigned donations, etc.)

module.exports = router;
