const { Pool } = require("pg");

let pool;

if (process.env.NODE_ENV === "test") {
  const { newDb } = require("pg-mem");

  const memoryDatabase = newDb();
  const pgAdapter = memoryDatabase.adapters.createPg();

  pool = new pgAdapter.Pool();
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required.");
  }

  const isProduction = process.env.NODE_ENV === "production";

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(30) NOT NULL,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
      ON users (LOWER(username));

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
      ON users (LOWER(email));

    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at BIGINT NOT NULL,
      revoked_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id
      ON refresh_sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at
      ON refresh_sessions(expires_at);
  `);
}

module.exports = {
  pool,
  initializeDatabase,
};