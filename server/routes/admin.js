// server/routes/admin.js
const express  = require("express");
const router   = express.Router();
const supabase = require("../utils/supabase");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// All admin routes require auth + admin role
router.use(authMiddleware, adminOnly);

// GET /api/admin/settings — get admin settings (threshold, geofence)
router.get("/settings", async (req, res) => {
  try {
    const { data } = await supabase
      .from("admin_settings")
      .select("*")
      .eq("admin_id", req.user.id)
      .single();
    res.json({ success: true, data: data || { pin_threshold: 5, geofence: null, area_name: "" } });
  } catch (e) {
    res.json({ success: true, data: { pin_threshold: 5, geofence: null, area_name: "" } });
  }
});

// PUT /api/admin/settings — update threshold and/or geofence
router.put("/settings", async (req, res) => {
  try {
    const { pin_threshold, geofence, area_name } = req.body;

    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("admin_id", req.user.id)
      .single();

    const payload = {
      admin_id: req.user.id,
      pin_threshold: pin_threshold ?? 5,
      geofence: geofence ?? null,
      area_name: area_name ?? "",
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      result = await supabase.from("admin_settings").update(payload).eq("admin_id", req.user.id).select().single();
    } else {
      result = await supabase.from("admin_settings").insert(payload).select().single();
    }

    // Broadcast threshold change via socket
    if (req.app.locals.io) {
      req.app.locals.io.emit("settings_update", { pin_threshold: payload.pin_threshold });
    }

    res.json({ success: true, data: result.data });
  } catch (e) {
    console.error("[admin settings]", e);
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

// GET /api/admin/reports — reports inside admin's geofence
router.get("/reports", async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("geofence")
      .eq("admin_id", req.user.id)
      .single();

    let query = supabase
      .from("reports")
      .select("*, users(id,username,avatar_color,badge)")
      .order("created_at", { ascending: false });

    const { data: reports } = await query;

    // Filter by geofence on server side if set
    let filtered = reports || [];
    if (settings?.geofence && filtered.length > 0) {
      filtered = filtered.filter(r => {
        if (!r.latitude || !r.longitude) return false;
        return isPointInPolygon([r.longitude, r.latitude], settings.geofence.coordinates[0]);
      });
    }

    res.json({ success: true, data: filtered });
  } catch (e) {
    console.error("[admin reports]", e);
    res.status(500).json({ success: false, error: "Failed to fetch reports" });
  }
});

// PATCH /api/admin/reports/:id/status
router.patch("/reports/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending","verified","in_progress","resolved"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, error: "Invalid status" });

    const { data } = await supabase
      .from("reports").update({ status }).eq("id", req.params.id).select().single();

    if (req.app.locals.io) req.app.locals.io.emit("status_update", { reportId: req.params.id, status });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [reports, users, verified] = await Promise.all([
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role","user"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status","verified"),
    ]);
    res.json({ success: true, data: {
      total_reports: reports.count || 0,
      total_users: users.count || 0,
      verified_reports: verified.count || 0,
    }});
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// Helper: point-in-polygon (ray casting)
function isPointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

module.exports = router;
