const express = require("express");

const {
  signup,
  signin,
  refresh,
  logout,
  me,
} = require("../controllers/auth.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/me", requireAuth, me);

module.exports = router;