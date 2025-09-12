const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const authController = require("../controllers/authController");

// ===== Register =====
router.post("/register", authController.register);

// ===== Login =====
router.post("/login", authController.login);

// ===== Get Profile (Protected) =====
router.get("/profile", authenticate, authController.getProfile);

// ===== Update Profile (Protected) =====
router.put("/profile", authenticate, authController.updateProfile);

// Debug route to check user role and permissions
router.get('/debug/role', authenticate, (req, res) => {
  console.log('Debug - User Role Check:', {
    userId: req.user._id,
    email: req.user.email,
    role: req.user.role,
    organization: req.user.organization,
    isVerified: req.user.isVerified,
    hasToken: !!req.headers.authorization,
    token: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'None'
  });

  // Check if user has a valid role
  const validRoles = ['Donor', 'Volunteer', 'NGO', 'Admin'];
  const hasValidRole = validRoles.includes(req.user.role);
  
  res.json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      hasValidRole,
      organization: req.user.organization,
      isVerified: req.user.isVerified,
      canAccessDonations: ['Volunteer', 'NGO', 'Admin'].includes(req.user.role)
    },
    tokenInfo: {
      exists: !!req.headers.authorization,
      startsWithBearer: req.headers.authorization?.startsWith('Bearer ')
    },
    currentTime: new Date().toISOString()
  });
});

module.exports = router;
