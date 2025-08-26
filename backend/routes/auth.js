const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Helper function to create a user object without the password
const sanitizeUser = (user) => {
  const { _id, username, email } = user;
  return { id: _id, username, email };
};

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    user = new User({ username, email, password });
    await user.save();

    // Create JWT Payload
    const payload = { id: user.id, username: user.username };
    // Sign token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "User registered successfully",
      token: `Bearer ${token}`,
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  (req, res) => {
    // Create JWT Payload
    const payload = { id: req.user.id, username: req.user.username };
    // Sign token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Logged in successfully",
      token: `Bearer ${token}`,
      user: sanitizeUser(req.user),
    });
  }
);

// Auth Status Check (protected route)
router.get(
  "/status",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    // If the middleware passes, the token is valid and req.user is populated.
    res.json({ isAuthenticated: true, user: sanitizeUser(req.user) });
  }
);

module.exports = router;
