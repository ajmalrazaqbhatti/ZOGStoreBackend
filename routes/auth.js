/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");

/********************************************************
 * USER SIGNUP
 ********************************************************/
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        db.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              return res.status(500).json({ message: "Error creating user" });
            }

            return res.status(201).json({
              message: "User registered successfully",
              userId: result.insertId,
            });
          },
        );
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/********************************************************
 * USER LOGIN
 ********************************************************/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Server error" });
        }

        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const userWithoutPassword = {
          id: user.id || user.user_id || user.userId || null,
          username: user.username,
          email: user.email,
          role: user.role || "user",
        };

        if (req.session) {
          req.session.user = userWithoutPassword;
          req.session.isAuthenticated = true;
        }

        return res.status(200).json({
          message: "Login successful",
          user: userWithoutPassword,
          sessionId: req.sessionID,
          isAuthenticated: req.session ? req.session.isAuthenticated : false,
        });
      },
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/********************************************************
 * USER LOGOUT
 ********************************************************/
router.get("/logout", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }

    res.clearCookie("connect.sid", { path: "/" });
    res.status(200).json({ message: "Logged out successfully" });
  });
});

/********************************************************
 * AUTH STATUS CHECK
 ********************************************************/
router.get("/status", (req, res) => {
  try {
    const isLoggedIn = req.session && req.session.isAuthenticated === true;

    res.status(200).json({
      isAuthenticated: isLoggedIn,
      user: isLoggedIn ? req.session.user : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
