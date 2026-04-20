const jwt = require("jsonwebtoken");
const supabase = require("../utils/supabase");
const SECRET = process.env.JWT_SECRET || "civicpulse_secret";

async function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ success:false, error:"No token provided" });
  try {
    const token = h.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    const { data: user } = await supabase.from("users").select("id,username,email,avatar_color,bio,report_count,verified_count,total_upvotes,badge,role").eq("id",decoded.id).single();
    if (!user) return res.status(401).json({ success:false, error:"User not found" });
    req.user = user;
    next();
  } catch (err) { 
    console.error("[Auth] JWT Error:", err.message);
    res.status(401).json({ success:false, error:"Invalid or expired token" }); 
  }
}

async function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(h.split(" ")[1], SECRET);
    const { data: user } = await supabase.from("users").select("id,username,avatar_color,badge,role").eq("id",decoded.id).single();
    if (user) req.user = user;
  } catch {}
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ success:false, error:"Admin only" });
  next();
}

module.exports = { authMiddleware, optionalAuth, adminOnly };
