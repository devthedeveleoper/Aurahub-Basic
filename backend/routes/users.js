const express = require("express");
const router = express.Router();
const { getUserProfile } = require("../controllers/userController");

// Route to get a user profile by username
// This is a public route, so no authentication is needed
router.get("/:username", getUserProfile);

module.exports = router;
