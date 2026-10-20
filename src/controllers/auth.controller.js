const bcrypt = require("bcrypt");

const { pool } = require("../config/database");

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

async function getSafeUser(userId, client = pool) {
  const result = await client.query(
    `SELECT id, username, name, email, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, getCookieOptions());
}

function createAuthResponse(user) {
  return {
    user,
    access_token: createAccessToken(user),
    token_type: "bearer",
    expires_in: 120,
  };
}

async function signup(req, res) {
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(username) = LOWER($1)
          OR LOWER(email) = LOWER($2)`,
      [username, email]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (
        username,
        name,
        email,
        password_hash
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id`,
      [username, name, email, passwordHash]
    );

    const user = await getSafeUser(result.rows[0].id, client);

    const refresh = await issueRefreshToken(user.id, client);

    await client.query("COMMIT");

    setRefreshCookie(res, refresh.token);

    return res.status(201).json({
      message: "Account created successfully.",
      ...createAuthResponse(user),
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error.
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    console.error("Signup failed:", error.message);

    return res.status(500).json({
      message: "Unable to create the account.",
    });
  } finally {
    client.release();
  }
}

async function signin(req, res) {
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

  try {
    const result = await pool.query(
      `SELECT id, username, name, email, password_hash, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1)
          OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    const user = result.rows[0];

    const passwordMatches =
      user && await bcrypt.compare(password, user.password_hash);

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

    const refresh = await issueRefreshToken(safeUser.id);

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

async function refresh(req, res) {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    clearRefreshCookie(res);

    return res.status(401).json({
      message: "Refresh token is required. Please sign in again.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash = require("node:crypto")
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const result = await client.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_sessions
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    const session = result.rows[0];

    if (!session) {
      await client.query("ROLLBACK");
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Invalid refresh token. Please sign in again.",
      });
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      session.revoked_at !== null ||
      Number(session.expires_at) <= now
    ) {
      await client.query("ROLLBACK");
      clearRefreshCookie(res);

      return res.status(401).json({
        message:
          "Refresh token is expired or revoked. Please sign in again.",
      });
    }

    const user = await getSafeUser(session.user_id, client);

    if (!user) {
      await client.query("ROLLBACK");
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "User account is no longer available.",
      });
    }

    const revokeResult = await client.query(
      `UPDATE refresh_sessions
       SET revoked_at = $1
       WHERE id = $2
         AND revoked_at IS NULL
         AND expires_at > $1`,
      [now, session.id]
    );

    if (revokeResult.rowCount !== 1) {
      await client.query("ROLLBACK");
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Refresh token has already been used.",
      });
    }

    const newRefresh = await issueRefreshToken(user.id, client);

    await client.query("COMMIT");

    setRefreshCookie(res, newRefresh.token);

    return res.json({
      message: "Access token refreshed successfully.",
      ...createAuthResponse(user),
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error.
    }

    console.error("Token refresh failed:", error.message);

    return res.status(500).json({
      message: "Unable to refresh the access token.",
    });
  } finally {
    client.release();
  }
}

async function logout(req, res) {
  const token = req.cookies[COOKIE_NAME];

  try {
    if (token) {
      const session = await findRefreshSession(token);

      if (session && session.revoked_at === null) {
        await revokeRefreshSession(session.id);
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