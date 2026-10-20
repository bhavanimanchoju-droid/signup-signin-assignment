const bcrypt = require("bcrypt");
const crypto = require("node:crypto");

const db = require("../config/database");

const {
  createAccessToken,
} = require("../services/token.service");

const {
  COOKIE_NAME,
  getCookieOptions,
  issueRefreshToken,
  findRefreshSession,
  revokeRefreshSession,
} = require("../services/refresh-token.service");

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

function getSafeUser(userId) {
  return db.prepare(`
    SELECT id, username, name, email, created_at
    FROM users
    WHERE id = ?
  `).get(userId);
}

function setRefreshCookie(res, token) {
  res.cookie(
    COOKIE_NAME,
    token,
    getCookieOptions()
  );
}

function clearRefreshCookie(res) {
  res.clearCookie(
    COOKIE_NAME,
    getCookieOptions()
  );
}

function createAuthResponse(user) {
  return {
    user,
    access_token: createAccessToken(user),
    token_type: "bearer",
    expires_in: 120,
  };
}

function signup(req, res) {
  const username =
    typeof req.body.username === "string"
      ? req.body.username.trim()
      : "";

  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : "";

  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  const password = req.body.password;

  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({
      message:
        "Username must contain 3-30 letters, numbers, or underscores.",
    });
  }

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({
      message: "Name must contain 2-80 characters.",
    });
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      message: "Enter a valid email address.",
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Password must be 8-72 bytes long.",
    });
  }

  try {
    const existing = db.prepare(`
      SELECT id
      FROM users
      WHERE username = ? COLLATE NOCASE
         OR email = ? COLLATE NOCASE
    `).get(username, email);

    if (existing) {
      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    const passwordHash = bcrypt.hashSync(password, 12);

    const result = db.prepare(`
      INSERT INTO users (
        username,
        name,
        email,
        password_hash
      )
      VALUES (?, ?, ?, ?)
    `).run(username, name, email, passwordHash);

    const user = getSafeUser(result.lastInsertRowid);

    const refresh = issueRefreshToken(user.id);

    setRefreshCookie(res, refresh.token);

    return res.status(201).json({
      message: "Account created successfully.",
      ...createAuthResponse(user),
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    console.error("Signup failed:", error.message);

    return res.status(500).json({
      message: "Unable to create the account.",
    });
  }
}

function signin(req, res) {
  const identifier =
    typeof req.body.identifier === "string"
      ? req.body.identifier.trim()
      : "";

  const password = req.body.password;

  if (
    !identifier ||
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Enter your username or email and password.",
    });
  }

  const user = db.prepare(`
    SELECT id, username, name, email, password_hash, created_at
    FROM users
    WHERE username = ? COLLATE NOCASE
       OR email = ? COLLATE NOCASE
  `).get(identifier, identifier.toLowerCase());

  const passwordMatches =
    user && bcrypt.compareSync(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({
      message: "Invalid username/email or password.",
    });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };

  try {
    const refresh = issueRefreshToken(safeUser.id);

    setRefreshCookie(res, refresh.token);

    return res.json({
      message: "Signed in successfully.",
      ...createAuthResponse(safeUser),
    });
  } catch (error) {
    console.error("Signin failed:", error.message);

    return res.status(500).json({
      message: "Unable to sign in.",
    });
  }
}

function refresh(req, res) {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    clearRefreshCookie(res);

    return res.status(401).json({
      message: "Refresh token is required. Please sign in again.",
    });
  }

  const session = findRefreshSession(token);

  if (!session) {
    clearRefreshCookie(res);

    return res.status(401).json({
      message: "Invalid refresh token. Please sign in again.",
    });
  }

  const now = Math.floor(Date.now() / 1000);

  if (session.revoked_at || session.expires_at <= now) {
    clearRefreshCookie(res);

    return res.status(401).json({
      message: "Refresh token is expired or revoked. Please sign in again.",
    });
  }

  const user = getSafeUser(session.user_id);

  if (!user) {
    revokeRefreshSession(session.id);
    clearRefreshCookie(res);

    return res.status(401).json({
      message: "User account is no longer available.",
    });
  }

  try {
    /*
     * Revoke the old session and issue a new refresh token
     * inside one database transaction.
     */
    const rotateRefreshToken = db.transaction(() => {
      const result = db.prepare(`
        UPDATE refresh_sessions
        SET revoked_at = ?
        WHERE id = ?
          AND revoked_at IS NULL
          AND expires_at > ?
      `).run(now, session.id, now);

      if (result.changes !== 1) {
        return null;
      }

      return issueRefreshToken(user.id);
    });

    const newRefresh = rotateRefreshToken();

    if (!newRefresh) {
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Refresh token has already been used.",
      });
    }

    setRefreshCookie(res, newRefresh.token);

    return res.json({
      message: "Access token refreshed successfully.",
      ...createAuthResponse(user),
    });
  } catch (error) {
    console.error("Token refresh failed:", error.message);

    return res.status(500).json({
      message: "Unable to refresh the access token.",
    });
  }
}

function logout(req, res) {
  const token = req.cookies[COOKIE_NAME];

  try {
    if (token) {
      const session = findRefreshSession(token);

      if (session && !session.revoked_at) {
        revokeRefreshSession(session.id);
      }
    }

    clearRefreshCookie(res);

    return res.json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout failed:", error.message);

    return res.status(500).json({
      message: "Unable to complete logout.",
    });
  }
}

function me(req, res) {
  return res.json(req.user);
}

module.exports = {
  signup,
  signin,
  refresh,
  logout,
  me,
};