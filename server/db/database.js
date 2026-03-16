// server/db/database.js
// Uses Node.js built-in sqlite (Node v22.5+) — zero native compilation needed
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DB_DIR, "civic.db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_color  TEXT NOT NULL DEFAULT '#ff5a1f',
    bio           TEXT DEFAULT '',
    report_count  INTEGER NOT NULL DEFAULT 0,
    verified_count INTEGER NOT NULL DEFAULT 0,
    total_upvotes INTEGER NOT NULL DEFAULT 0,
    badge         TEXT DEFAULT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'other',
    image_url       TEXT,
    latitude        REAL,
    longitude       REAL,
    address         TEXT DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending',
    net_votes       INTEGER NOT NULL DEFAULT 0,
    upvote_count    INTEGER NOT NULL DEFAULT 0,
    downvote_count  INTEGER NOT NULL DEFAULT 0,
    unique_upvoters INTEGER NOT NULL DEFAULT 0,
    pinned_to_map   INTEGER NOT NULL DEFAULT 0,
    comment_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id          TEXT PRIMARY KEY,
    report_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    vote_type   TEXT NOT NULL CHECK(vote_type IN ('up','down')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(report_id, user_id),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    report_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
  );
`);

// Thin helpers — same interface as better-sqlite3
module.exports = {
  get:  (sql, params = []) => db.prepare(sql).get(...params),
  all:  (sql, params = []) => db.prepare(sql).all(...params),
  run:  (sql, params = []) => db.prepare(sql).run(...params),
  exec: (sql)              => db.exec(sql),
};
