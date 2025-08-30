const { verifyToken } = require("../utils/jwt");
const User = require("../models/user");

// Authenticate JWT
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user; // attach full user object to request
    next();
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Role-based Access Control
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authenticated',
        path: req.originalUrl
      });
    }

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    const userRole = req.user.role?.toLowerCase();
    const hasRole = roles.some(role => role.toLowerCase() === userRole);
    
    if (roles.length && !hasRole) {
      return res.status(403).json({ 
        success: false,
        message: `Role '${req.user.role}' is not authorized for this resource`
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
