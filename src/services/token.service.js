const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL_SECONDS = 120;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters."
    );
  }

  return secret;
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      type: "access",
    },
    getJwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
}

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  createAccessToken,
  verifyAccessToken,
};