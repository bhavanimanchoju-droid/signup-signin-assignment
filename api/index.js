const app = require("../src/server");

module.exports = async (req, res) => {
  try {
    await app.locals.databaseReady;
    return app(req, res);
  } catch (error) {
    console.error("Request failed:", error.message);

    return res.status(500).json({
      message: "Service temporarily unavailable."
    });
  }
};
