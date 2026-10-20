const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const testDatabasePath = path.join(
  os.tmpdir(),
  `assignment-auth-test-${process.pid}.db`
);

// Set environment variables before loading the application.
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = testDatabasePath;
process.env.JWT_SECRET =
  "automated-test-secret-at-least-32-characters-long";

const app = require("../src/server");
const db = require("../src/config/database");

const testUser = {
  username: "test_user_01",
  name: "Test User",
  email: "test.user@example.com",
  password: "TestPassword123!",
};

let refreshToken;
let accessToken;

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

beforeEach(() => {
  db.prepare("DELETE FROM refresh_sessions").run();
  db.prepare("DELETE FROM users").run();

  refreshToken = undefined;
  accessToken = undefined;
});

afterAll(() => {
  db.close();

  for (const suffix of ["", "-wal", "-shm"]) {
    const filePath = testDatabasePath + suffix;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
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

    const storedUser = db
      .prepare("SELECT password_hash FROM users WHERE email = ?")
      .get(testUser.email);

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

    refreshToken = getCookieValue(signup, "refresh_token");

    expect(refreshToken).toBeTruthy();

    const oldToken = refreshToken;

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

    const oldSession = db
      .prepare("SELECT revoked_at FROM refresh_sessions WHERE token_hash = ?")
      .get(
        require("node:crypto")
          .createHash("sha256")
          .update(oldToken)
          .digest("hex")
      );

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

    refreshToken = getCookieValue(signup, "refresh_token");

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