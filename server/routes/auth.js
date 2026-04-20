const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const supabase = require("../utils/supabase");
const upload = require("../middleware/upload");
const { authMiddleware } = require("../middleware/auth");

const SECRET = process.env.JWT_SECRET || "civicpulse_secret";
const ADMIN_CODE = process.env.ADMIN_SECRET_CODE || "admin123";
const COLORS = ["#ff5a1f","#00c9a7","#fbbf24","#a78bfa","#60a5fa","#f87171","#34d399","#fb923c"];
const sign = u => jwt.sign({ id:u.id, username:u.username, role:u.role }, SECRET, { expiresIn:"30d" });

async function createUser(email, password, username, role, res) {
  const { data: authData, error: authErr } = await supabase.auth.signUp({ email: email.toLowerCase(), password });
  if (authErr) {
    if (authErr.message.toLowerCase().includes("already")) return res.status(409).json({ success:false, error:"Email already registered" });
    return res.status(400).json({ success:false, error: authErr.message });
  }
  if (!authData?.user?.id) return res.status(400).json({ success:false, error:"Failed to create user" });
  const { data: existing } = await supabase.from("users").select("id").eq("username", username).single();
  if (existing) { await supabase.auth.admin.deleteUser(authData.user.id).catch(()=>{}); return res.status(409).json({ success:false, error:"Username taken" }); }
  const avatar_color = COLORS[Math.floor(Math.random()*COLORS.length)];
  const { data: user, error: uErr } = await supabase.from("users").insert({ id:authData.user.id, username:username.trim(), email:email.toLowerCase(), avatar_color, role }).select().single();
  if (uErr) return res.status(500).json({ success:false, error:"Profile creation failed: "+uErr.message });
  return { user, token: sign(user) };
}

router.post("/register", async (req,res) => {
  try {
    const { username, email, password } = req.body;
    if (!username||!email||!password) return res.status(400).json({ success:false, error:"All fields required" });
    if (username.trim().length<3) return res.status(400).json({ success:false, error:"Username min 3 chars" });
    if (password.length<6) return res.status(400).json({ success:false, error:"Password min 6 chars" });
    const result = await createUser(email, password, username.trim(), "user", res);
    if (result?.user) res.status(201).json({ success:true, token:result.token, user:result.user });
  } catch(e) { console.error("[register]",e); res.status(500).json({ success:false, error:"Registration failed" }); }
});

router.post("/admin/register", async (req,res) => {
  try {
    const { username, email, password, secret_code } = req.body;
    if (secret_code !== ADMIN_CODE) return res.status(403).json({ success:false, error:"Invalid admin secret code" });
    if (!username||!email||!password) return res.status(400).json({ success:false, error:"All fields required" });
    const result = await createUser(email, password, username.trim(), "admin", res);
    if (result?.user) res.status(201).json({ success:true, token:result.token, user:result.user });
  } catch(e) { console.error("[admin register]",e); res.status(500).json({ success:false, error:"Registration failed" }); }
});

router.post("/login", async (req,res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ success:false, error:"Email and password required" });
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email:email.toLowerCase(), password });
    if (authErr) return res.status(401).json({ success:false, error:"Invalid credentials" });
    const { data: user } = await supabase.from("users").select("id,username,email,avatar_color,bio,report_count,verified_count,total_upvotes,badge,role").eq("id",authData.user.id).single();
    if (!user) return res.status(401).json({ success:false, error:"User profile not found" });
    res.json({ success:true, token:sign(user), user });
  } catch(e) { console.error("[login]",e); res.status(500).json({ success:false, error:"Login failed" }); }
});

router.post("/forgot-password", async (req,res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success:false, error:"Email required" });
    await supabase.auth.resetPasswordForEmail(email.toLowerCase(), { redirectTo:`${process.env.CLIENT_URL}/reset-password` });
    res.json({ success:true, message:"Reset link sent if email exists" });
  } catch(e) { res.status(500).json({ success:false, error:"Failed" }); }
});

router.post("/reset-password", async (req,res) => {
  try {
    const { access_token, new_password } = req.body;
    if (!access_token||!new_password) return res.status(400).json({ success:false, error:"Token and password required" });
    if (new_password.length<6) return res.status(400).json({ success:false, error:"Password min 6 chars" });
    const { data:{ user }, error } = await supabase.auth.getUser(access_token);
    if (error||!user) return res.status(400).json({ success:false, error:"Invalid or expired link" });
    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, { password:new_password });
    if (updErr) return res.status(400).json({ success:false, error:updErr.message });
    res.json({ success:true, message:"Password updated" });
  } catch(e) { res.status(500).json({ success:false, error:"Reset failed" }); }
});

router.get("/me", authMiddleware, (req,res) => res.json({ success:true, user:req.user }));

// PUT /api/auth/profile — update profile with optional avatar
router.put("/profile", authMiddleware, upload.single("avatar"), async (req,res) => {
  try {
    const { username, bio } = req.body;
    const updates = {};
    if (username && username.trim().length >= 3) {
      const { data: existing } = await supabase.from("users").select("id").eq("username",username.trim()).neq("id",req.user.id).single();
      if (existing) return res.status(409).json({ success:false, error:"Username taken" });
      updates.username = username.trim();
    }
    if (bio !== undefined) updates.bio = bio;
    if (req.file) {
      /*
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileName = `avatars/${req.user.id}${path.extname(req.file.originalname)}`;
      const { error: uploadErr } = await supabase.storage.from("images").upload(fileName, fileBuffer, { contentType:req.file.mimetype, upsert:true });
      if (!uploadErr) {
        const { data:{ publicUrl } } = supabase.storage.from("images").getPublicUrl(fileName);
        updates.avatar_url = publicUrl;
      }
      */
      fs.unlinkSync(req.file.path);
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ success:false, error:"Nothing to update" });
    const { data: user, error } = await supabase.from("users").update(updates).eq("id",req.user.id).select().single();
    if (error) return res.status(500).json({ success:false, error:error.message });
    const newToken = sign(user);
    res.json({ success:true, user, token:newToken });
  } catch(e) { console.error("[profile update]",e); res.status(500).json({ success:false, error:"Update failed" }); }
});

module.exports = router;
