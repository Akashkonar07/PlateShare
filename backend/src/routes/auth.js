const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { generateToken } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");

// ===== Register =====
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate request body
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    // ensure role is capitalized and valid
    const validRoles = ["Donor", "Volunteer", "NGO", "Admin"];
    let formattedRole;
    
    if (role.toLowerCase() === "ngo") {
      formattedRole = "NGO";
    } else {
      formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }
    
    if (!validRoles.includes(formattedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // create user (password will be hashed by pre-save hook)
    user = await User.create({
      name,
      email,
      password, // Don't hash here - let the model do it
      role: formattedRole,
    });

    // generate token
    const token = generateToken(user);

    // return safe user data
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== Login =====
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Use the model's comparePassword method
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
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ===== Get Profile (Protected) =====
router.get("/profile", authenticate, async (req, res) => {
  try {
    // req.user is already the full user object from authenticate middleware
    const safeUser = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      points: req.user.points,
      badges: req.user.badges,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
    };
    res.json(safeUser);
  } catch (err) {
    console.error("Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
