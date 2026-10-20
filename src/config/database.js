const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

const configuredPath =
  process.env.DATABASE_PATH || "./data/auth.db";

const databasePath = path.resolve(configuredPath);

fs.mkdirSync(path.dirname(databasePath), {
  recursive: true,
});

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS refresh_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id
    ON refresh_sessions(user_id);

  CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at
    ON refresh_sessions(expires_at);
`);

module.exports = db;