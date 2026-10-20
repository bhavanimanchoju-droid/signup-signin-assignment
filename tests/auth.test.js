const request = require("supertest");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

// Set environment variables before loading the application.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  "automated-test-secret-at-least-32-characters-long";

const app = require("../src/server");
const { pool } = require("../src/config/database");

const testUser = {
  username: "test_user_01",
  name: "Test User",
  email: "test.user@example.com",
  password: "TestPassword123!",
};

function getCookieValue(response, cookieName) {
  const cookies = response.headers["set-cookie"] || [];

  const cookie = cookies.find((value) =>
    value.startsWith(`${cookieName}=`)
  );

  if (!cookie) {
    return null;
  }

  return cookie.split(";")[0].slice(cookieName.length + 1);
}

function getCookieHeader(token) {
  return `refresh_token=${token}`;
}

beforeAll(async () => {
  await app.locals.databaseReady;
});

beforeEach(async () => {
  await pool.query("DELETE FROM refresh_sessions");
  await pool.query("DELETE FROM users");
});

afterAll(async () => {
  await pool.end();
});

describe("Authentication API", () => {
  test("signup creates an account and issues tokens", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.access_token).toBeDefined();
    expect(response.body.expires_in).toBe(120);

    expect(
      getCookieValue(response, "refresh_token")
    ).toBeTruthy();

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [testUser.email]
    );

    const storedUser = result.rows[0];

    expect(storedUser).toBeDefined();
    expect(storedUser.password_hash).not.toBe(testUser.password);
    expect(storedUser.password_hash).toMatch(/^\$2[aby]\$/);
  });

  test("duplicate signup is rejected", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(response.status).toBe(409);
  });

  test("signin accepts the registered email and password", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/signin")
      .send({
        identifier: testUser.email,
        password: testUser.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.access_token).toBeDefined();

    const payload = jwt.decode(response.body.access_token);

    expect(payload.exp - payload.iat).toBe(120);
  });

  test("incorrect password is rejected", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/signin")
      .send({
        identifier: testUser.email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
  });

  test("protected profile rejects a missing access token", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  test("refresh rotates the refresh token and rejects the old token", async () => {
    const signup = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const oldToken = getCookieValue(signup, "refresh_token");

    expect(oldToken).toBeTruthy();

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", getCookieHeader(oldToken));

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.access_token).toBeDefined();
    expect(refreshResponse.body.expires_in).toBe(120);

    const newToken = getCookieValue(
      refreshResponse,
      "refresh_token"
    );

    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);

    const tokenHash = crypto
      .createHash("sha256")
      .update(oldToken)
      .digest("hex");

    const result = await pool.query(
      `SELECT revoked_at
       FROM refresh_sessions
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const oldSession = result.rows[0];

    expect(oldSession).toBeDefined();
    expect(oldSession.revoked_at).not.toBeNull();

    const replayResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", getCookieHeader(oldToken));

    expect(replayResponse.status).toBe(401);
  });

  test("logout revokes the refresh token", async () => {
    const signup = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const refreshToken = getCookieValue(signup, "refresh_token");

    expect(refreshToken).toBeTruthy();

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", getCookieHeader(refreshToken));

    expect(logoutResponse.status).toBe(200);

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", getCookieHeader(refreshToken));

    expect(refreshResponse.status).toBe(401);
  });
});