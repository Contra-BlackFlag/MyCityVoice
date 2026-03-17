// server/routes/reports.js
const express  = require("express");
const router   = express.Router();
const { v4: uuidv4 } = require("uuid");
const supabase = require("../utils/supabase");
const upload   = require("../middleware/upload");
const { authMiddleware, optionalAuth } = require("../middleware/auth");
const { recalculateRankings } = require("../utils/rankings");
const path = require("path");
const fs   = require("fs");

async function getThreshold() {
  const { data } = await supabase.from("admin_settings").select("pin_threshold").limit(1).single();
  return data?.pin_threshold ?? 5;
}

function enrichReport(r) {
  const author = r.users || null;
  const { users, ...rest } = r;
  return { ...rest, author };
}

// GET /api/reports — public feed
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { category, sort = "newest", limit = 20, offset = 0 } = req.query;
    let query = supabase.from("reports")
      .select("*, users(id,username,avatar_color,badge)", { count: "exact" });

    if (category && category !== "all") query = query.eq("category", category);

    if (sort === "popular") query = query.order("net_votes", { ascending: false }).order("created_at", { ascending: false });
    else if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    // Attach userVote if logged in
    let reports = (data || []).map(enrichReport);
    if (req.user) {
      const ids = reports.map(r => r.id);
      const { data: votes } = await supabase.from("votes")
        .select("report_id,vote_type").eq("user_id", req.user.id).in("report_id", ids);
      const voteMap = {};
      (votes || []).forEach(v => { voteMap[v.report_id] = v.vote_type; });
      reports = reports.map(r => ({ ...r, userVote: voteMap[r.id] || null }));
    }

    res.json({ success: true, data: reports, total: count || 0 });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed to fetch feed" }); }
});

// GET /api/reports/map — only pinned reports
router.get("/map", optionalAuth, async (req, res) => {
  try {
    const { data } = await supabase.from("reports")
      .select("id,user_id,title,category,status,latitude,longitude,net_votes,upvote_count,unique_upvoters,created_at,users(id,username,avatar_color,badge)")
      .eq("pinned_to_map", true).order("created_at", { ascending: false });
    res.json({ success: true, data: (data || []).map(enrichReport) });
  } catch (e) { res.status(500).json({ success: false, error: "Failed" }); }
});

// GET /api/reports/leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const { data } = await supabase.from("users")
      .select("id,username,avatar_color,badge,report_count,verified_count,total_upvotes")
      .eq("role","user").order("total_upvotes", { ascending: false }).limit(20);
    const scored = (data || []).map(u => ({
      ...u, score: u.verified_count*10 + u.total_upvotes*2 + u.report_count
    })).sort((a,b) => b.score - a.score);
    res.json({ success: true, data: scored });
  } catch (e) { res.status(500).json({ success: false, error: "Failed" }); }
});

// GET /api/reports/settings — public threshold
router.get("/settings", async (req, res) => {
  try {
    const threshold = await getThreshold();
    res.json({ success: true, pin_threshold: threshold });
  } catch (e) { res.json({ success: true, pin_threshold: 5 }); }
});

// GET /api/reports/user/:userId
router.get("/user/:userId", optionalAuth, async (req, res) => {
  try {
    const { data: user } = await supabase.from("users")
      .select("id,username,avatar_color,badge,report_count,verified_count,total_upvotes,bio")
      .eq("id", req.params.userId).single();
    const { data: reports } = await supabase.from("reports")
      .select("*, users(id,username,avatar_color,badge)")
      .eq("user_id", req.params.userId).order("created_at", { ascending: false });
    res.json({ success: true, data: (reports||[]).map(enrichReport), user });
  } catch (e) { res.status(500).json({ success: false, error: "Failed" }); }
});

// GET /api/reports/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { data: report } = await supabase.from("reports")
      .select("*, users(id,username,avatar_color,badge)").eq("id", req.params.id).single();
    if (!report) return res.status(404).json({ success: false, error: "Not found" });

    const { data: comments } = await supabase.from("comments")
      .select("*, users(id,username,avatar_color,badge)")
      .eq("report_id", req.params.id).order("created_at", { ascending: true });

    let userVote = null;
    if (req.user) {
      const { data: v } = await supabase.from("votes")
        .select("vote_type").eq("report_id", req.params.id).eq("user_id", req.user.id).single();
      userVote = v?.vote_type || null;
    }

    const enrichedComments = (comments||[]).map(c => {
      const { users, ...rest } = c;
      return { ...rest, username: users?.username, avatar_color: users?.avatar_color, badge: users?.badge };
    });

    res.json({ success: true, data: { ...enrichReport(report), comments: enrichedComments, userVote } });
  } catch (e) { res.status(500).json({ success: false, error: "Failed" }); }
});

// POST /api/reports — create
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;
    if (!title || !description)
      return res.status(400).json({ success: false, error: "Title and description required" });

    let image_url = null;
    if (req.file) {
      // Upload to Supabase Storage
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileName   = `reports/${uuidv4()}${path.extname(req.file.originalname)}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("images").upload(fileName, fileBuffer, { contentType: req.file.mimetype });
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(fileName);
        image_url = publicUrl;
      }
      fs.unlinkSync(req.file.path); // clean up local file
    }

    const lat = latitude  ? parseFloat(latitude)  : null;
    const lng = longitude ? parseFloat(longitude) : null;

    const { data: report, error } = await supabase.from("reports").insert({
      user_id: req.user.id, title, description,
      category: category || "other", image_url, latitude: lat, longitude: lng,
      address: address || "", status: "pending",
    }).select("*, users(id,username,avatar_color,badge)").single();

    if (error) throw error;

    await supabase.from("users").update({ report_count: (req.user.report_count||0) + 1 }).eq("id", req.user.id);
    recalculateRankings();

    const enriched = enrichReport(report);
    if (req.app.locals.io) req.app.locals.io.emit("new_report", enriched);
    res.status(201).json({ success: true, data: enriched });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed to create report" }); }
});

// POST /api/reports/:id/vote
router.post("/:id/vote", authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    if (!["up","down"].includes(type))
      return res.status(400).json({ success: false, error: "Vote type must be up or down" });

    const { data: report } = await supabase.from("reports").select("*").eq("id", req.params.id).single();
    if (!report) return res.status(404).json({ success: false, error: "Not found" });
    if (report.user_id === req.user.id)
      return res.status(400).json({ success: false, error: "Cannot vote on your own report" });

    const { data: existing } = await supabase.from("votes")
      .select("*").eq("report_id", req.params.id).eq("user_id", req.user.id).single();

    let upvoteDelta = 0, downvoteDelta = 0, netDelta = 0;

    if (existing) {
      if (existing.vote_type === type) {
        await supabase.from("votes").delete().eq("report_id", req.params.id).eq("user_id", req.user.id);
        if (type === "up") { upvoteDelta = -1; netDelta = -1; }
        else { downvoteDelta = -1; netDelta = 1; }
      } else {
        await supabase.from("votes").update({ vote_type: type }).eq("report_id", req.params.id).eq("user_id", req.user.id);
        if (type === "up") { upvoteDelta = 1; downvoteDelta = -1; netDelta = 2; }
        else { upvoteDelta = -1; downvoteDelta = 1; netDelta = -2; }
      }
    } else {
      await supabase.from("votes").insert({ id: uuidv4(), report_id: req.params.id, user_id: req.user.id, vote_type: type });
      if (type === "up") { upvoteDelta = 1; netDelta = 1; }
      else { downvoteDelta = 1; netDelta = -1; }
    }

    // Update counts
    const newUpvotes   = (report.upvote_count   || 0) + upvoteDelta;
    const newDownvotes = (report.downvote_count  || 0) + downvoteDelta;
    const newNet       = (report.net_votes       || 0) + netDelta;

    // Recalculate unique upvoters
    const { count: uniq } = await supabase.from("votes")
      .select("*", { count: "exact", head: true })
      .eq("report_id", req.params.id).eq("vote_type", "up");

    // Get current threshold
    const threshold = await getThreshold();
    const shouldPin = (uniq || 0) >= threshold && newNet > 0;
    const wasVerified = report.status === "verified";

    const updates = {
      upvote_count: newUpvotes, downvote_count: newDownvotes,
      net_votes: newNet, unique_upvoters: uniq || 0,
      pinned_to_map: shouldPin,
      status: shouldPin ? "verified" : (wasVerified ? "pending" : report.status),
    };

    await supabase.from("reports").update(updates).eq("id", req.params.id);

    // Update verified_count for author
    if (shouldPin && !report.pinned_to_map) {
      await supabase.from("users").update({ verified_count: supabase.rpc("increment", { row_id: report.user_id }) });
      const { data: authorStats } = await supabase.from("reports")
        .select("upvote_count").eq("user_id", report.user_id);
      const totalUp = (authorStats||[]).reduce((s,r) => s + (r.upvote_count||0), 0);
      await supabase.from("users").update({ total_upvotes: totalUp }).eq("id", report.user_id);
    }

    recalculateRankings();

    const { data: voteRow } = await supabase.from("votes")
      .select("vote_type").eq("report_id", req.params.id).eq("user_id", req.user.id).single();

    const payload = {
      reportId: req.params.id, net_votes: newNet,
      upvote_count: newUpvotes, downvote_count: newDownvotes,
      unique_upvoters: uniq||0, pinned_to_map: shouldPin,
      status: updates.status,
    };
    if (req.app.locals.io) req.app.locals.io.emit("vote_update", payload);
    res.json({ success: true, ...payload, userVote: voteRow?.vote_type || null });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Vote failed" }); }
});

// POST /api/reports/:id/comments
router.post("/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, error: "Content required" });

    const { data: comment } = await supabase.from("comments").insert({
      id: uuidv4(), report_id: req.params.id, user_id: req.user.id, content: content.trim(),
    }).select("*, users(id,username,avatar_color,badge)").single();

    await supabase.from("reports").update({ comment_count: supabase.rpc("increment_comments", { rid: req.params.id }) }).eq("id", req.params.id);

    const { users, ...rest } = comment;
    const enriched = { ...rest, username: users?.username, avatar_color: users?.avatar_color, badge: users?.badge };
    if (req.app.locals.io) req.app.locals.io.emit("new_comment", { reportId: req.params.id, comment: enriched });
    res.status(201).json({ success: true, data: enriched });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Comment failed" }); }
});

module.exports = router;
