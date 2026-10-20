const { verifyAccessToken } = require("../services/token.service");
const { pool } = require("../config/database");

async function requireAuth(req, res, next) {
  const authorization = req.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token.",
    });
  }

  const userId = Number(payload.sub);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({
      message: "Invalid access token.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, name, email, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid access token.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireAuth,
};