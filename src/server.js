require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("node:path");

const {
  pool,
  initializeDatabase,
} = require("./config/database");

const authRoutes = require("./routes/auth.routes");

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "signup-signin-assignment",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "authentication-api",
  });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Resource not found.",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled request error:", err.message);

  res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

const PORT = Number(process.env.PORT) || 3000;

const databaseReady = initializeDatabase();

if (require.main === module) {
  databaseReady
    .then(() => {
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server listening on port ${PORT}`);
      });

      server.on("close", () => {
        pool.end().catch((error) => {
          console.error("Database shutdown failed:", error.message);
        });
      });
    })
    .catch(async (error) => {
      console.error("Database initialization failed:", error.message);
      await pool.end().catch(() => {});
      process.exitCode = 1;
    });
}

app.locals.databaseReady = databaseReady;
app.locals.databasePool = pool;

module.exports = app;