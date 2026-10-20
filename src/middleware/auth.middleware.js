const { verifyAccessToken } = require("../services/token.service");
const db = require("../config/database");

function requireAuth(req, res, next) {
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

  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Invalid access token.",
      });
    }

    const user = db.prepare(`
      SELECT id, username, name, email, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token.",
    });
  }
}

module.exports = { requireAuth };