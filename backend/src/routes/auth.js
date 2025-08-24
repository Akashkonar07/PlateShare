const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");

// ===== Register =====
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    user = await User.create({ name, email, password, role });
    const token = generateToken(user);

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== Login =====
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
