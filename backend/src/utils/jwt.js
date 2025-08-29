const jwt = require("jsonwebtoken");

/**
 * Generate JWT token for a user
 * @param {Object} user - Mongoose user object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  if (!user || !user._id || !user.role) {
    throw new Error("Invalid user object for token generation");
  }

  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Verify JWT token safely
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return null; // or throw a custom error if you prefer
  }
};

/**
 * Middleware example for Express to protect routes
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = decoded; // attach decoded user info to request
  next();
};

module.exports = { generateToken, verifyToken, authMiddleware };
