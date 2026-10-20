const app = require("../src/server");

module.exports = async (req, res) => {
  try {
    const requestedPath = req.query.__path;

    if (typeof requestedPath === "string") {
      const queryIndex = req.url.indexOf("?");
      const originalQuery =
        queryIndex >= 0 ? req.url.slice(queryIndex + 1) : "";

      const params = new URLSearchParams(originalQuery);
      params.delete("__path");

      const remainingQuery = params.toString();

      req.url =
        requestedPath +
        (remainingQuery ? `?${remainingQuery}` : "");
    }

    await app.locals.databaseReady;

    return app(req, res);
  } catch (error) {
    console.error("Request failed:", error.message);

    return res.status(500).json({
      message: "Service temporarily unavailable."
    });
  }
};
