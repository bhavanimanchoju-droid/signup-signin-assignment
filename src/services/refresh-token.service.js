const crypto = require("node:crypto");
const db = require("../config/database");

const REFRESH_TOKEN_TTL_DAYS = 7;
const COOKIE_NAME = "refresh_token";

function hashRefreshToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
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

function issueRefreshToken(userId) {
  const token = createRefreshToken();
  const tokenHash = hashRefreshToken(token);

  const now = Math.floor(Date.now() / 1000);

  const expiresAt =
    now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

  const sessionId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO refresh_sessions (
      id,
      user_id,
      token_hash,
      expires_at,
      revoked_at,
      created_at
    )
    VALUES (?, ?, ?, ?, NULL, ?)
  `).run(
    sessionId,
    userId,
    tokenHash,
    expiresAt,
    now
  );

  return {
    token,
    sessionId,
    expiresAt,
  };
}

function findRefreshSession(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const tokenHash = hashRefreshToken(token);

  return db.prepare(`
    SELECT
      id,
      user_id,
      token_hash,
      expires_at,
      revoked_at,
      created_at
    FROM refresh_sessions
    WHERE token_hash = ?
  `).get(tokenHash) || null;
}

function revokeRefreshSession(sessionId) {
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    UPDATE refresh_sessions
    SET revoked_at = ?
    WHERE id = ?
      AND revoked_at IS NULL
  `).run(now, sessionId);
}

function revokeRefreshToken(token) {
  const session = findRefreshSession(token);

  if (session && !session.revoked_at) {
    revokeRefreshSession(session.id);
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