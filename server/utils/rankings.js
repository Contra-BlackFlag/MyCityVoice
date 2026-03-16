// server/utils/rankings.js
const db = require("../db/database");
const BADGES = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Score = verified*10 + total_upvotes*2 + report_count*1
function recalculateRankings() {
  try {
    db.run("UPDATE users SET badge = NULL");
    const top = db.all(`
      SELECT id, (verified_count*10 + total_upvotes*2 + report_count) AS score
      FROM users ORDER BY score DESC, created_at ASC LIMIT 3
    `);
    top.forEach((u, i) => {
      if (u.score > 0) db.run("UPDATE users SET badge = ? WHERE id = ?", [BADGES[i+1], u.id]);
    });
  } catch (e) { console.error("[Rankings]", e.message); }
}

module.exports = { recalculateRankings };
