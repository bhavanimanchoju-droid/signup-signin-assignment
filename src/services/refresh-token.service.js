const crypto = require("node:crypto");
const { pool } = require("../config/database");

const REFRESH_TOKEN_TTL_DAYS = 7;
const COOKIE_NAME = "refresh_token";

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

async function issueRefreshToken(userId, client = pool) {
  const token = createRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  const sessionId = crypto.randomUUID();

  await client.query(
    `INSERT INTO refresh_sessions
      (id, user_id, token_hash, expires_at, revoked_at, created_at)
     VALUES ($1, $2, $3, $4, NULL, $5)`,
    [sessionId, userId, tokenHash, expiresAt, now]
  );

  return {
    token,
    sessionId,
    expiresAt,
  };
}

async function findRefreshSession(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const tokenHash = hashRefreshToken(token);

  const result = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
     FROM refresh_sessions
     WHERE token_hash = $1`,
    [tokenHash]
  );

  return result.rows[0] || null;
}

async function revokeRefreshSession(sessionId, client = pool) {
  const now = Math.floor(Date.now() / 1000);

  await client.query(
    `UPDATE refresh_sessions
     SET revoked_at = $1
     WHERE id = $2 AND revoked_at IS NULL`,
    [now, sessionId]
  );
}

async function revokeRefreshToken(token) {
  const session = await findRefreshSession(token);

  if (session && session.revoked_at === null) {
    await revokeRefreshSession(session.id);
  }

  return session;
}

module.exports = {
  COOKIE_NAME,
  REFRESH_TOKEN_TTL_DAYS,
  getCookieOptions,
  issueRefreshToken,
  findRefreshSession,
  revokeRefreshSession,
  revokeRefreshToken,
};