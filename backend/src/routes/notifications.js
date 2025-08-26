
const express = require("express");
const router = express.Router();

// Example middleware
const { authenticate } = require("../middleware/auth");

// Example route
router.get("/test", authenticate, (req, res) => {
  res.json({ message: "Notifications route works!" });
});

// TODO: Add real notification routes here

module.exports = router;
