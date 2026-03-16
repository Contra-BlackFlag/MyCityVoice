// db/database.js
// Uses Node.js built-in sqlite (available in Node v22.5+, stable in v25)
// No installation required — zero native compilation issues.
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DB_DIR, "civic_reports.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better performance
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    image_url TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    upvotes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS upvotes (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(report_id, session_id),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  );
`);

module.exports = db;
