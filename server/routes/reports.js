// routes/reports.js
const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db/database");
const upload = require("../middleware/upload");

// Helper: node:sqlite prepare().all / .get take positional args as a single array
// We wrap for clarity
function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

// GET /api/reports - fetch all reports (for map & feed)
router.get("/", (req, res) => {
  try {
    const { category, status, limit = 50, offset = 0, sort = "newest" } = req.query;

    let query = "SELECT * FROM reports WHERE 1=1";
    const params = [];

    if (category && category !== "all") {
      query += " AND category = ?";
      params.push(category);
    }

    if (status && status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }

    const orderMap = {
      newest: "created_at DESC",
      oldest: "created_at ASC",
      popular: "upvotes DESC",
    };
    query += ` ORDER BY ${orderMap[sort] || "created_at DESC"}`;
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const reports = all(query, params);

    const countParams = category && category !== "all" ? [category] : [];
    const countQuery = "SELECT COUNT(*) as count FROM reports" +
      (category && category !== "all" ? " WHERE category = ?" : "");
    const total = get(countQuery, countParams).count;

    res.json({ success: true, data: reports, total });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ success: false, error: "Failed to fetch reports" });
  }
});

// GET /api/reports/map - all reports for map (minimal payload)
router.get("/map", (req, res) => {
  try {
    const reports = all(
      "SELECT id, title, category, status, latitude, longitude, upvotes, created_at FROM reports ORDER BY created_at DESC"
    );
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error("Error fetching map reports:", err);
    res.status(500).json({ success: false, error: "Failed to fetch map data" });
  }
});

// GET /api/reports/:id - fetch single report with comments
router.get("/:id", (req, res) => {
  try {
    const report = get("SELECT * FROM reports WHERE id = ?", [req.params.id]);

    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const comments = all(
      "SELECT * FROM comments WHERE report_id = ? ORDER BY created_at ASC",
      [req.params.id]
    );

    res.json({ success: true, data: { ...report, comments } });
  } catch (err) {
    console.error("Error fetching report:", err);
    res.status(500).json({ success: false, error: "Failed to fetch report" });
  }
});

// POST /api/reports - create new report
router.post("/", upload.single("image"), (req, res) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;

    if (!title || !description || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Title, description, and location are required",
      });
    }

    const id = uuidv4();
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    run(
      `INSERT INTO reports (id, title, description, category, image_url, latitude, longitude, address, status, upvotes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, datetime('now'), datetime('now'))`,
      [id, title, description, category || "other", image_url,
       parseFloat(latitude), parseFloat(longitude), address || ""]
    );

    const newReport = get("SELECT * FROM reports WHERE id = ?", [id]);

    if (req.app.locals.io) {
      req.app.locals.io.emit("new_report", newReport);
    }

    res.status(201).json({ success: true, data: newReport });
  } catch (err) {
    console.error("Error creating report:", err);
    res.status(500).json({ success: false, error: "Failed to create report" });
  }
});

// POST /api/reports/:id/upvote
router.post("/:id/upvote", (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    const report = get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const existing = get(
      "SELECT id FROM upvotes WHERE report_id = ? AND session_id = ?",
      [req.params.id, session_id]
    );

    if (existing) {
      run("DELETE FROM upvotes WHERE report_id = ? AND session_id = ?", [req.params.id, session_id]);
      run("UPDATE reports SET upvotes = upvotes - 1 WHERE id = ?", [req.params.id]);
    } else {
      run("INSERT INTO upvotes (id, report_id, session_id) VALUES (?, ?, ?)",
        [uuidv4(), req.params.id, session_id]);
      run("UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?", [req.params.id]);
    }

    const updated = get("SELECT upvotes FROM reports WHERE id = ?", [req.params.id]);

    if (req.app.locals.io) {
      req.app.locals.io.emit("upvote_update", {
        reportId: req.params.id,
        upvotes: updated.upvotes,
      });
    }

    res.json({ success: true, upvotes: updated.upvotes, voted: !existing });
  } catch (err) {
    console.error("Error upvoting:", err);
    res.status(500).json({ success: false, error: "Failed to upvote" });
  }
});

// POST /api/reports/:id/comments
router.post("/:id/comments", (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Comment content required" });
    }

    const report = get("SELECT id FROM reports WHERE id = ?", [req.params.id]);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const id = uuidv4();
    run("INSERT INTO comments (id, report_id, content) VALUES (?, ?, ?)",
      [id, req.params.id, content.trim()]);

    const comment = get("SELECT * FROM comments WHERE id = ?", [id]);

    if (req.app.locals.io) {
      req.app.locals.io.emit("new_comment", { reportId: req.params.id, comment });
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ success: false, error: "Failed to add comment" });
  }
});

// PATCH /api/reports/:id/status
router.patch("/:id/status", (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["open", "in_progress", "resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    run("UPDATE reports SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, req.params.id]);

    const updated = get("SELECT * FROM reports WHERE id = ?", [req.params.id]);

    if (req.app.locals.io) {
      req.app.locals.io.emit("status_update", { reportId: req.params.id, status });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

module.exports = router;
