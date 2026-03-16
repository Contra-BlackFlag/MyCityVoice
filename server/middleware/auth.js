// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const db  = require("../db/database");
const SECRET = process.env.JWT_SECRET || "civicpulse_secret";

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "No token provided" });
  try {
    const decoded = jwt.verify(header.split(" ")[1], SECRET);
    const user = db.get(
      "SELECT id, username, email, avatar_color, bio, report_count, verified_count, total_upvotes, badge FROM users WHERE id = ?",
      [decoded.id]
    );
    if (!user) return res.status(401).json({ success: false, error: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(header.split(" ")[1], SECRET);
    const user = db.get("SELECT id, username, avatar_color, badge FROM users WHERE id = ?", [decoded.id]);
    if (user) req.user = user;
  } catch {}
  next();
}

module.exports = { authMiddleware, optionalAuth };
