const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// file imports
const pool = require("../config/database");

// ============================================
// REGISTER ENDPOINT
// ============================================

router.post("/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, username } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Please provide username, email, and password!",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters.",
      });
    }

    const checkQuery = "SELECT id from users WHERE email = $1 OR username = $2"; // anti sql injection haha
    const checkResult = await client.query(checkQuery, [email, username]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        error: "Email or username already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertQuery = `
            INSERT INTO users (email, password_hash, username)
            VALUES ($1, $2, $3)
            RETURNING id, email, username, created_at
        `;

    const insertResult = await client.query(insertQuery, [
      email,
      passwordHash,
      username,
    ]);

    const newUser = insertResult.rows[0];

    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "User registered successfully",
      token: token, // For Android
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (error) {
    console.error("Register Error: ", error);
    res.status(500).json({ error: "Server error during registration" });
  } finally {
    client.release();
  }
});

// ============================================
// LOGIN ENDPOINT
// ============================================
router.post("/login", async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Please provide email and password",
      });
    }

    // 2. Find user
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await client.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash); // returns boolean haha

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 5. Set cookie (for web)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 6. Send response
    res.json({
      message: "Login successful",
      token: token, // For Android
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  } finally {
    client.release();
  }
});

// ============================================
// LOGOUT ENDPOINT
// ============================================
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout successful" });
});

// ============================================
// GET CURRENT USER
// ============================================
router.get("/me", async (req, res) => {
  const client = await pool.connect();

  try {
    // Get token from cookie (web) or Authorization header (Android)
    const token =
      req.cookies.token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const query =
      "SELECT id, email, username, created_at FROM users WHERE id = $1";
    const result = await client.query(query, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  } finally {
    client.release();
  }
});

module.exports = router;
