// server/routes/auth.js
const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db       = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const SECRET  = process.env.JWT_SECRET || "civicpulse_secret";
const COLORS  = ["#ff5a1f","#00c9a7","#fbbf24","#a78bfa","#60a5fa","#f87171","#34d399","#fb923c"];
const sign    = (u) => jwt.sign({ id: u.id, username: u.username }, SECRET, { expiresIn: "30d" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, error: "All fields required" });
    if (username.trim().length < 3)
      return res.status(400).json({ success: false, error: "Username min 3 characters" });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: "Password min 6 characters" });

    if (db.get("SELECT id FROM users WHERE email = ?",    [email.toLowerCase()]))
      return res.status(409).json({ success: false, error: "Email already registered" });
    if (db.get("SELECT id FROM users WHERE username = ?", [username.trim()]))
      return res.status(409).json({ success: false, error: "Username taken" });

    const id             = uuidv4();
    const password_hash  = await bcrypt.hash(password, 10);
    const avatar_color   = COLORS[Math.floor(Math.random() * COLORS.length)];

    db.run(
      "INSERT INTO users (id, username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)",
      [id, username.trim(), email.toLowerCase(), password_hash, avatar_color]
    );

    const user  = db.get("SELECT id,username,email,avatar_color,bio,report_count,verified_count,total_upvotes,badge FROM users WHERE id = ?", [id]);
    const token = sign(user);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password required" });

    const user = db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const { password_hash, ...safe } = user;
    res.json({ success: true, token: sign(safe), user: safe });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
