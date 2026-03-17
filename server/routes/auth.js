// server/routes/auth.js
const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../utils/supabase");
const { authMiddleware } = require("../middleware/auth");

const SECRET   = process.env.JWT_SECRET || "civicpulse_secret";
const ADMIN_CODE = process.env.ADMIN_SECRET_CODE || "admin123";
const COLORS   = ["#ff5a1f","#00c9a7","#fbbf24","#a78bfa","#60a5fa","#f87171","#34d399","#fb923c"];
const sign     = u => jwt.sign({ id: u.id, username: u.username, role: u.role }, SECRET, { expiresIn: "30d" });

async function createUser(email, password, username, role, res) {
  // Step 1: Create auth user using signUp (works without admin API)
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: { emailRedirectTo: null },
  });

  if (authErr) {
    if (authErr.message.toLowerCase().includes("already"))
      return res.status(409).json({ success: false, error: "Email already registered" });
    return res.status(400).json({ success: false, error: authErr.message });
  }

  if (!authData?.user?.id) {
    return res.status(400).json({ success: false, error: "Failed to create auth user. Check Supabase email settings." });
  }

  const userId = authData.user.id;

  // Step 2: Check username uniqueness
  const { data: existing } = await supabase.from("users").select("id").eq("username", username).single();
  if (existing) {
    // Clean up auth user if username taken
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    return res.status(409).json({ success: false, error: "Username already taken" });
  }

  // Step 3: Insert user profile
  const avatar_color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const { data: user, error: userErr } = await supabase.from("users").insert({
    id: userId,
    username: username.trim(),
    email: email.toLowerCase(),
    avatar_color,
    role,
  }).select().single();

  if (userErr) {
    console.error("[createUser profile]", userErr);
    return res.status(500).json({ success: false, error: "Failed to create user profile: " + userErr.message });
  }

  return { user, token: sign(user) };
}

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

    const result = await createUser(email, password, username.trim(), "user", res);
    if (result && result.user) {
      res.status(201).json({ success: true, token: result.token, user: result.user });
    }
  } catch (e) {
    console.error("[register]", e);
    res.status(500).json({ success: false, error: "Registration failed: " + e.message });
  }
});

// POST /api/auth/admin/register
router.post("/admin/register", async (req, res) => {
  try {
    const { username, email, password, secret_code } = req.body;
    if (secret_code !== ADMIN_CODE)
      return res.status(403).json({ success: false, error: "Invalid admin secret code" });
    if (!username || !email || !password)
      return res.status(400).json({ success: false, error: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: "Password min 6 characters" });

    const result = await createUser(email, password, username.trim(), "admin", res);
    if (result && result.user) {
      res.status(201).json({ success: true, token: result.token, user: result.user });
    }
  } catch (e) {
    console.error("[admin register]", e);
    res.status(500).json({ success: false, error: "Registration failed: " + e.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password required" });

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (authErr) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const { data: user, error: userErr } = await supabase.from("users")
      .select("id,username,email,avatar_color,bio,report_count,verified_count,total_upvotes,badge,role")
      .eq("id", authData.user.id).single();

    if (userErr || !user)
      return res.status(401).json({ success: false, error: "User profile not found" });

    res.json({ success: true, token: sign(user), user });
  } catch (e) {
    console.error("[login]", e);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email required" });

    await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`,
    });
    // Always return success (prevent email enumeration)
    res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to send reset email" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { access_token, new_password } = req.body;
    if (!access_token || !new_password)
      return res.status(400).json({ success: false, error: "Token and new password required" });
    if (new_password.length < 6)
      return res.status(400).json({ success: false, error: "Password min 6 characters" });

    // Verify the token and update password
    const { data: { user }, error: verifyErr } = await supabase.auth.getUser(access_token);
    if (verifyErr || !user)
      return res.status(400).json({ success: false, error: "Invalid or expired reset link" });

    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (updateErr)
      return res.status(400).json({ success: false, error: "Reset failed: " + updateErr.message });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (e) {
    res.status(500).json({ success: false, error: "Reset failed" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
