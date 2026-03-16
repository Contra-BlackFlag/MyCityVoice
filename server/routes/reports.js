// server/routes/reports.js
const express  = require("express");
const router   = express.Router();
const { v4: uuidv4 } = require("uuid");
const db       = require("../db/database");
const upload   = require("../middleware/upload");
const { authMiddleware, optionalAuth } = require("../middleware/auth");
const { recalculateRankings }          = require("../utils/rankings");

const MAP_THRESHOLD = 5; // unique upvotes needed to pin to map

function enrichReport(r, userId = null) {
  if (!r) return null;
  const author   = db.get("SELECT id,username,avatar_color,badge FROM users WHERE id = ?", [r.user_id]);
  let   userVote = null;
  if (userId) {
    const v = db.get("SELECT vote_type FROM votes WHERE report_id = ? AND user_id = ?", [r.id, userId]);
    userVote = v ? v.vote_type : null;
  }
  return { ...r, author, userVote };
}

// GET /api/reports  — public feed (all users)
router.get("/", optionalAuth, (req, res) => {
  try {
    const { category, sort = "newest", limit = 20, offset = 0 } = req.query;
    let sql    = "SELECT * FROM reports WHERE 1=1";
    const params = [];
    if (category && category !== "all") { sql += " AND category = ?"; params.push(category); }
    const order = { newest: "created_at DESC", popular: "net_votes DESC, created_at DESC", oldest: "created_at ASC" };
    sql += ` ORDER BY ${order[sort] || "created_at DESC"} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const rows = db.all(sql, params).map(r => enrichReport(r, req.user?.id));

    let cSql = "SELECT COUNT(*) as count FROM reports WHERE 1=1";
    const cParams = [];
    if (category && category !== "all") { cSql += " AND category = ?"; cParams.push(category); }
    const total = db.get(cSql, cParams).count;

    res.json({ success: true, data: rows, total });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed to fetch feed" }); }
});

// GET /api/reports/map  — only verified/pinned reports
router.get("/map", optionalAuth, (req, res) => {
  try {
    const rows = db.all(
      "SELECT id,user_id,title,category,status,latitude,longitude,net_votes,upvote_count,unique_upvoters,created_at FROM reports WHERE pinned_to_map = 1 ORDER BY created_at DESC"
    ).map(r => enrichReport(r, req.user?.id));
    res.json({ success: true, data: rows });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed" }); }
});

// GET /api/reports/leaderboard
router.get("/leaderboard", (req, res) => {
  try {
    const users = db.all(`
      SELECT id,username,avatar_color,badge,report_count,verified_count,total_upvotes,
             (verified_count*10 + total_upvotes*2 + report_count) AS score
      FROM users ORDER BY score DESC, created_at ASC LIMIT 20
    `);
    res.json({ success: true, data: users });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed" }); }
});

// GET /api/reports/user/:userId
router.get("/user/:userId", optionalAuth, (req, res) => {
  try {
    const user  = db.get("SELECT id,username,avatar_color,badge,report_count,verified_count,total_upvotes,bio FROM users WHERE id = ?", [req.params.userId]);
    const posts = db.all("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC", [req.params.userId])
                    .map(r => enrichReport(r, req.user?.id));
    res.json({ success: true, data: posts, user });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed" }); }
});

// GET /api/reports/:id
router.get("/:id", optionalAuth, (req, res) => {
  try {
    const report = db.get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
    if (!report) return res.status(404).json({ success: false, error: "Not found" });
    const comments = db.all(
      "SELECT c.*,u.username,u.avatar_color,u.badge FROM comments c JOIN users u ON c.user_id=u.id WHERE c.report_id=? ORDER BY c.created_at ASC",
      [req.params.id]
    );
    res.json({ success: true, data: { ...enrichReport(report, req.user?.id), comments } });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed" }); }
});

// POST /api/reports  — create
router.post("/", authMiddleware, upload.single("image"), (req, res) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;
    if (!title || !description)
      return res.status(400).json({ success: false, error: "Title and description required" });

    const id        = uuidv4();
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const lat       = latitude  ? parseFloat(latitude)  : null;
    const lng       = longitude ? parseFloat(longitude) : null;

    db.run(
      "INSERT INTO reports (id,user_id,title,description,category,image_url,latitude,longitude,address) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, req.user.id, title, description, category || "other", image_url, lat, lng, address || ""]
    );
    db.run("UPDATE users SET report_count = report_count + 1 WHERE id = ?", [req.user.id]);
    recalculateRankings();

    const report = enrichReport(db.get("SELECT * FROM reports WHERE id = ?", [id]), req.user.id);
    if (req.app.locals.io) req.app.locals.io.emit("new_report", report);
    res.status(201).json({ success: true, data: report });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Failed to create report" }); }
});

// POST /api/reports/:id/vote
router.post("/:id/vote", authMiddleware, (req, res) => {
  try {
    const { type } = req.body;
    if (!["up","down"].includes(type))
      return res.status(400).json({ success: false, error: "Vote type must be up or down" });

    const report = db.get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
    if (!report) return res.status(404).json({ success: false, error: "Not found" });
    if (report.user_id === req.user.id)
      return res.status(400).json({ success: false, error: "Cannot vote on your own report" });

    const existing = db.get("SELECT * FROM votes WHERE report_id=? AND user_id=?", [req.params.id, req.user.id]);

    if (existing) {
      if (existing.vote_type === type) {
        // Toggle off
        db.run("DELETE FROM votes WHERE report_id=? AND user_id=?", [req.params.id, req.user.id]);
        db.run(`UPDATE reports SET ${type==="up"?"upvote_count=upvote_count-1,net_votes=net_votes-1":"downvote_count=downvote_count-1,net_votes=net_votes+1"} WHERE id=?`, [req.params.id]);
      } else {
        // Switch vote
        db.run("UPDATE votes SET vote_type=? WHERE report_id=? AND user_id=?", [type, req.params.id, req.user.id]);
        db.run(`UPDATE reports SET ${type==="up"?"upvote_count=upvote_count+1,downvote_count=downvote_count-1,net_votes=net_votes+2":"upvote_count=upvote_count-1,downvote_count=downvote_count+1,net_votes=net_votes-2"} WHERE id=?`, [req.params.id]);
      }
    } else {
      // New vote
      db.run("INSERT INTO votes (id,report_id,user_id,vote_type) VALUES (?,?,?,?)", [uuidv4(), req.params.id, req.user.id, type]);
      db.run(`UPDATE reports SET ${type==="up"?"upvote_count=upvote_count+1,net_votes=net_votes+1":"downvote_count=downvote_count+1,net_votes=net_votes-1"} WHERE id=?`, [req.params.id]);
    }

    // Recalculate unique upvoters
    const uniq = db.get("SELECT COUNT(DISTINCT user_id) AS cnt FROM votes WHERE report_id=? AND vote_type='up'", [req.params.id]).cnt;
    db.run("UPDATE reports SET unique_upvoters=? WHERE id=?", [uniq, req.params.id]);

    // Pin / unpin map
    const updated = db.get("SELECT * FROM reports WHERE id=?", [req.params.id]);
    const shouldPin = uniq >= MAP_THRESHOLD && updated.net_votes > 0;
    if (shouldPin && !updated.pinned_to_map) {
      db.run("UPDATE reports SET pinned_to_map=1, status='verified' WHERE id=?", [req.params.id]);
      db.run("UPDATE users SET verified_count=verified_count+1 WHERE id=?", [updated.user_id]);
    } else if (!shouldPin && updated.pinned_to_map) {
      db.run("UPDATE reports SET pinned_to_map=0, status='pending' WHERE id=?", [req.params.id]);
      db.run("UPDATE users SET verified_count=MAX(0,verified_count-1) WHERE id=?", [updated.user_id]);
    }

    // Update author total_upvotes
    const totUp = db.get("SELECT COALESCE(SUM(upvote_count),0) AS t FROM reports WHERE user_id=?", [updated.user_id]).t;
    db.run("UPDATE users SET total_upvotes=? WHERE id=?", [totUp, updated.user_id]);
    recalculateRankings();

    const final    = db.get("SELECT * FROM reports WHERE id=?", [req.params.id]);
    const voteRow  = db.get("SELECT vote_type FROM votes WHERE report_id=? AND user_id=?", [req.params.id, req.user.id]);
    const payload  = {
      reportId:       req.params.id,
      net_votes:      final.net_votes,
      upvote_count:   final.upvote_count,
      downvote_count: final.downvote_count,
      unique_upvoters:final.unique_upvoters,
      pinned_to_map:  final.pinned_to_map,
      status:         final.status,
    };
    if (req.app.locals.io) req.app.locals.io.emit("vote_update", payload);
    res.json({ success: true, ...payload, userVote: voteRow?.vote_type || null });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Vote failed" }); }
});

// POST /api/reports/:id/comments
router.post("/:id/comments", authMiddleware, (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, error: "Content required" });
    if (!db.get("SELECT id FROM reports WHERE id=?", [req.params.id]))
      return res.status(404).json({ success: false, error: "Not found" });

    const id = uuidv4();
    db.run("INSERT INTO comments (id,report_id,user_id,content) VALUES (?,?,?,?)", [id, req.params.id, req.user.id, content.trim()]);
    db.run("UPDATE reports SET comment_count=comment_count+1 WHERE id=?", [req.params.id]);

    const comment = db.get(
      "SELECT c.*,u.username,u.avatar_color,u.badge FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?", [id]
    );
    if (req.app.locals.io) req.app.locals.io.emit("new_comment", { reportId: req.params.id, comment });
    res.status(201).json({ success: true, data: comment });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Comment failed" }); }
});

module.exports = router;
