const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  getTransporter,
  getFromAddress,
  isEmailEnabled,
} = require("../utils/mailer");

const router = express.Router();

// file imports
const pool = require("../config/database");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = Math.max(
  15,
  Number(process.env.RESET_TOKEN_TTL_MINUTES || 60)
);
const APP_NAME = process.env.APP_NAME || "DogScan AI";
const RESET_PASSWORD_URL_BASE =
  process.env.RESET_PASSWORD_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173/reset-password";
const RETURN_RESET_TOKEN =
  process.env.RETURN_RESET_TOKEN === "true" || process.env.NODE_ENV !== "production";
const REQUIRE_RESET_EMAIL =
  process.env.REQUIRE_RESET_EMAIL === "true" || process.env.NODE_ENV === "production";

function buildTokenPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    sv: Number(user.session_version ?? 1),
  };
}

function signToken(user) {
  return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, { expiresIn: "7d" });
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: user.created_at,
    is_admin: Boolean(user.is_admin),
    is_superadmin: Boolean(user.is_superadmin),
    is_banned: Boolean(user.is_banned),
    banned_until: user.banned_until,
  };
}

function normalizeEmail(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function buildResetUrl(token) {
  const separator = RESET_PASSWORD_URL_BASE.includes("?") ? "&" : "?";
  return `${RESET_PASSWORD_URL_BASE}${separator}token=${encodeURIComponent(token)}`;
}

async function unbanIfExpired(client, user) {
  if (!user?.is_banned) return user;

  const banEnd = user.banned_until ? new Date(user.banned_until) : null;
  const banEndTime = banEnd ? banEnd.getTime() : NaN;
  const hasExpired = !banEnd || Number.isNaN(banEndTime) || banEndTime <= Date.now();
  if (!hasExpired) return user;

  const updated = await client.query(
    `UPDATE users
     SET is_banned = FALSE,
         banned_until = NULL,
         ban_reason = NULL,
         banned_at = NULL,
         banned_by = NULL
     WHERE id = $1
     RETURNING id, email, username, created_at, is_admin, is_superadmin, is_banned, banned_until, ban_reason, session_version`,
    [user.id]
  );

  return updated.rows[0] ?? user;
}

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
            RETURNING id, email, username, created_at, is_admin, is_superadmin, is_banned, banned_until, session_version
        `;

    const insertResult = await client.query(insertQuery, [
      email,
      passwordHash,
      username,
    ]);

    const newUser = insertResult.rows[0];

    const token = signToken(newUser);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "User registered successfully",
      token: token, // For Android
      user: serializeUser(newUser),
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
    const query = `
      SELECT
        id, email, username, created_at, password_hash,
        is_admin, is_superadmin, is_banned, banned_until, ban_reason, session_version
      FROM users
      WHERE email = $1
    `;
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

    const normalizedUser = await unbanIfExpired(client, user);
    if (normalizedUser.is_banned) {
      return res.status(403).json({
        error: "Your account is banned.",
        code: "ACCOUNT_BANNED",
        banned_until: normalizedUser.banned_until,
        ban_reason: normalizedUser.ban_reason || null,
      });
    }

    // 4. Create JWT token
    const token = signToken(normalizedUser);

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
      user: serializeUser(normalizedUser),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  } finally {
    client.release();
  }
});

// ============================================
// FORGOT PASSWORD ENDPOINT
// ============================================
router.post("/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  const genericResponse = {
    message: "If that email exists, a password reset link has been sent.",
  };

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.json(genericResponse);
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await client.query(
      `INSERT INTO password_reset_tokens
       (user_id, token_hash, expires_at, request_ip, request_user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        tokenHash,
        expiresAt,
        req.ip || null,
        req.headers["user-agent"] || null,
      ]
    );

    const resetUrl = buildResetUrl(token);
    let mailSent = false;
    if (isEmailEnabled()) {
      try {
        const transporter = await getTransporter();
        if (transporter) {
          const subject = `${APP_NAME} password reset`;
          const text = [
            `We received a request to reset your ${APP_NAME} password.`,
            "",
            "Use the link below to set a new password:",
            resetUrl,
            "",
            `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
            "If you did not request this, you can ignore this email.",
          ].join("\n");
          const html = `
            <p>We received a request to reset your <strong>${APP_NAME}</strong> password.</p>
            <p><a href="${resetUrl}">Click here to reset your password</a></p>
            <p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
          `;

          await transporter.sendMail({
            from: getFromAddress(),
            to: user.email,
            subject,
            text,
            html,
          });
          mailSent = true;
        }
      } catch (error) {
        console.error("Reset email error:", error);
        if (REQUIRE_RESET_EMAIL) {
          return res.status(500).json({ error: "Failed to send reset email." });
        }
      }
    } else if (REQUIRE_RESET_EMAIL) {
      return res.status(500).json({ error: "Email service not configured." });
    }

    if (RETURN_RESET_TOKEN && !mailSent) {
      return res.json({ ...genericResponse, reset_url: resetUrl });
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Server error while requesting reset." });
  } finally {
    client.release();
  }
});

// ============================================
// RESET PASSWORD ENDPOINT
// ============================================
router.post("/reset-password", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const newPassword = typeof req.body?.password === "string" ? req.body.password : "";

  if (!token) {
    return res.status(400).json({ error: "Reset token is required." });
  }
  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.password_hash
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const row = result.rows[0];
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (row.used_at || !expiresAt || expiresAt.getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, row.password_hash);
    if (isSameAsCurrent) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "New password must be different from current password.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           password_changed_at = NOW(),
           session_version = session_version + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, row.user_id]
    );

    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW(),
           used_ip = $1
       WHERE id = $2`,
      [req.ip || null, row.id]
    );

    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL AND id <> $2`,
      [row.user_id, row.id]
    );

    await client.query("COMMIT");
    return res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Server error while resetting password." });
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
    const query = `
      SELECT
        id, email, username, created_at,
        is_admin, is_superadmin, is_banned, banned_until, ban_reason, session_version
      FROM users
      WHERE id = $1
    `;
    const tokenUserId = decoded?.userId ?? decoded?.id;
    const result = await client.query(query, [tokenUserId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = await unbanIfExpired(client, result.rows[0]);
    if (Number(decoded?.sv ?? 1) !== Number(user.session_version ?? 1)) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }
    if (user.is_banned) {
      return res.status(403).json({
        error: "Your account is banned.",
        code: "ACCOUNT_BANNED",
        banned_until: user.banned_until,
        ban_reason: user.ban_reason || null,
      });
    }

    const refreshedToken = signToken(user);
    res.cookie("token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: serializeUser(user), token: refreshedToken });
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  } finally {
    client.release();
  }
});

module.exports = router;
