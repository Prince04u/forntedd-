const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../config/logger");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "luckynova-super-secret-jwt-key-2026");

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Your account is suspended. Please contact support." });
      }

      req.user = user;
      return next();
    } catch (error) {
      logger.warn(`JWT verification failed: ${error.message}`);
      return res.status(401).json({ message: "Not authorized, token invalid or expired" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Administrator privileges required." });
};

module.exports = { protect, adminOnly };
