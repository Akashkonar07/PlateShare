const express = require("express");
const router = express.Router();

// Example middleware (optional)
const { authenticate, authorize } = require("../middleware/auth");

// Example route
router.get("/test", authenticate, authorize(["NGO"]), (req, res) => {
  res.json({ message: "NGO route works!" });
});

// TODO: Add real NGO routes here

module.exports = router;
