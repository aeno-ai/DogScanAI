const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const {
  getTransporter,
  getFromAddress,
  isEmailEnabled,
} = require("../utils/mailer");
const pool = require("../config/database");
const {
  EMAIL_REGEX,
  generateUniqueUsername,
  getUserAuthStateByEmail,
  getUserAuthStateById,
  getUserByOAuthSubject,
  getUserLoginStateByEmail,
  getPasswordValidationError,
  linkOAuthAccount,
  normalizeEmail,
  serializeUser,
  signToken,
  trimValue,
  unbanIfExpired,
  upsertPasswordCredential,
} = require("../utils/auth-helpers");
const {
  GoogleAuthError,
  getAllowedGoogleClientIds,
  verifyGoogleIdToken,
} = require("../utils/googleAuth");
const {
  buildPolicyAcceptanceRequiredResponse,
  getRegistrationPolicy,
  hasAcceptedCurrentRegistrationPolicy,
  recordPolicyAcceptance,
} = require("../utils/auth-policy");

const router = express.Router();

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

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function trimUsername(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function buildResetUrl(token) {
  const separator = RESET_PASSWORD_URL_BASE.includes("?") ? "&" : "?";
  return `${RESET_PASSWORD_URL_BASE}${separator}token=${encodeURIComponent(token)}`;
}

function buildAuthResponsePayload(user, extra = {}) {
  const serializedUser = serializeUser(user);
  return {
    user: serializedUser,
    auth_providers: serializedUser.auth_providers,
    ...extra,
  };
}

async function readAuthenticatedUserFromToken(client, req) {
  const token =
    req.cookies.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) return { token: null, user: null, decoded: null };

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const tokenUserId = decoded?.userId ?? decoded?.id;
  const user = await getUserAuthStateById(client, tokenUserId);
  return { token, user, decoded };
}

function getGoogleMessage(status) {
  if (status === "linked_existing") {
    return "Google sign-in was linked to your existing DogScanAI account.";
  }
  if (status === "created_new") {
    return "Your DogScanAI account was created with Google sign-in.";
  }
  return "Signed in with Google.";
}

router.get("/policy", (_req, res) => {
  return res.json(getRegistrationPolicy());
});

router.post("/register", async (req, res) => {
  const client = await pool.connect();

  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const username = trimUsername(req.body?.username);

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Please provide username, email, and password!",
      });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    const passwordValidationError = getPasswordValidationError(password);
    if (passwordValidationError) {
      return res.status(400).json({
        error: passwordValidationError,
      });
    }
    if (!hasAcceptedCurrentRegistrationPolicy(req.body)) {
      return res.status(428).json(buildPolicyAcceptanceRequiredResponse());
    }

    await client.query("BEGIN");

    const checkResult = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = LOWER($1)
          OR LOWER(username) = LOWER($2)
       LIMIT 1`,
      [email, username]
    );

    if (checkResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Email or username already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email, passwordHash, username]
    );

    const userId = insertResult.rows[0].id;
    await upsertPasswordCredential(client, userId, passwordHash);
    await recordPolicyAcceptance(client, userId, req);

    const newUser = await getUserAuthStateById(client, userId);
    await client.query("COMMIT");

    const token = signToken(newUser);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      ...buildAuthResponsePayload(newUser),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Register Error:", error);
    return res.status(500).json({ error: "Server error during registration" });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const client = await pool.connect();

  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        error: "Please provide email and password",
      });
    }

    const user = await getUserLoginStateByEmail(client, email);
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: "This account uses Google sign-in. Continue with Google to access it.",
        code: "PASSWORD_LOGIN_UNAVAILABLE",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
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

    const token = signToken(normalizedUser);
    setAuthCookie(res, token);

    return res.json({
      message: "Login successful",
      token,
      ...buildAuthResponsePayload(normalizedUser),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login" });
  } finally {
    client.release();
  }
});

router.post("/google", async (req, res) => {
  const allowedGoogleClientIds = getAllowedGoogleClientIds();
  if (allowedGoogleClientIds.length === 0) {
    return res.status(503).json({
      error: "Google sign-in is not configured on the server.",
      code: "GOOGLE_AUTH_NOT_CONFIGURED",
    });
  }

  let payload;
  try {
    payload = await verifyGoogleIdToken(req.body?.id_token, allowedGoogleClientIds);
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error("Google auth verification error:", error);
    return res.status(500).json({ error: "Failed to verify Google sign-in." });
  }

  const email = normalizeEmail(payload?.email);
  const emailVerified =
    payload?.email_verified === true || String(payload?.email_verified) === "true";

  if (!email || !EMAIL_REGEX.test(email) || !emailVerified) {
    return res.status(400).json({
      error: "Google account must provide a verified email address.",
      code: "GOOGLE_EMAIL_NOT_VERIFIED",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let user = await getUserByOAuthSubject(client, "google", payload.sub);
    let googleAuthStatus = "existing_linked";

    if (user) {
      await linkOAuthAccount(client, {
        userId: user.id,
        provider: "google",
        providerSubject: payload.sub,
        providerEmail: email,
        emailVerified,
        profileName: trimValue(payload?.name) || null,
        profileImageUrl: trimValue(payload?.picture) || null,
      });
      user = await getUserAuthStateById(client, user.id);
    } else {
      const existingUser = await getUserAuthStateByEmail(client, email);

      if (existingUser) {
        await linkOAuthAccount(client, {
          userId: existingUser.id,
          provider: "google",
          providerSubject: payload.sub,
          providerEmail: email,
          emailVerified,
          profileName: trimValue(payload?.name) || null,
          profileImageUrl: trimValue(payload?.picture) || null,
        });
        user = await getUserAuthStateById(client, existingUser.id);
        googleAuthStatus = "linked_existing";
      } else {
        if (!hasAcceptedCurrentRegistrationPolicy(req.body)) {
          await client.query("ROLLBACK");
          return res.status(428).json(buildPolicyAcceptanceRequiredResponse());
        }

        const username = await generateUniqueUsername(
          client,
          trimValue(payload?.name) || email.split("@")[0]
        );
        const insertResult = await client.query(
          `INSERT INTO users (email, password_hash, username)
           VALUES ($1, NULL, $2)
           RETURNING id`,
          [email, username]
        );

        await linkOAuthAccount(client, {
          userId: insertResult.rows[0].id,
          provider: "google",
          providerSubject: payload.sub,
          providerEmail: email,
          emailVerified,
          profileName: trimValue(payload?.name) || null,
          profileImageUrl: trimValue(payload?.picture) || null,
        });
        await recordPolicyAcceptance(client, insertResult.rows[0].id, req);
        user = await getUserAuthStateById(client, insertResult.rows[0].id);
        googleAuthStatus = "created_new";
      }
    }

    user = await unbanIfExpired(client, user);
    if (user.is_banned) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Your account is banned.",
        code: "ACCOUNT_BANNED",
        banned_until: user.banned_until,
        ban_reason: user.ban_reason || null,
      });
    }

    await client.query("COMMIT");

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: getGoogleMessage(googleAuthStatus),
      token,
      google_auth_status: googleAuthStatus,
      google_auth_message: getGoogleMessage(googleAuthStatus),
      ...buildAuthResponsePayload(user),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.code === "OAUTH_SUBJECT_CONFLICT") {
      return res.status(409).json({
        error: "That Google account is already linked elsewhere.",
        code: "GOOGLE_ACCOUNT_ALREADY_LINKED",
      });
    }
    console.error("Google auth error:", error);
    return res.status(500).json({ error: "Server error during Google sign-in" });
  } finally {
    client.release();
  }
});

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
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
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

router.post("/reset-password", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const newPassword = typeof req.body?.password === "string" ? req.body.password : "";

  if (!token) {
    return res.status(400).json({ error: "Reset token is required." });
  }
  const passwordValidationError = getPasswordValidationError(newPassword);
  if (passwordValidationError) {
    return res.status(400).json({ error: passwordValidationError });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT
         prt.id,
         prt.user_id,
         prt.expires_at,
         prt.used_at,
         upc.password_hash
       FROM password_reset_tokens prt
       JOIN users u
         ON u.id = prt.user_id
       LEFT JOIN user_password_credentials upc
         ON upc.user_id = u.id
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

    if (row.password_hash) {
      const isSameAsCurrent = await bcrypt.compare(newPassword, row.password_hash);
      if (isSameAsCurrent) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "New password must be different from current password.",
        });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await upsertPasswordCredential(client, row.user_id, passwordHash);

    await client.query(
      `UPDATE users
       SET password_changed_at = NOW(),
           session_version = session_version + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [row.user_id]
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
       WHERE user_id = $1
         AND used_at IS NULL
         AND id <> $2`,
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

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout successful" });
});

router.get("/me", async (req, res) => {
  const client = await pool.connect();

  try {
    const { token, user: initialUser, decoded } = await readAuthenticatedUserFromToken(
      client,
      req
    );

    if (!token || !decoded) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!initialUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = await unbanIfExpired(client, initialUser);
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
    setAuthCookie(res, refreshedToken);

    return res.json({
      token: refreshedToken,
      ...buildAuthResponsePayload(user),
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  } finally {
    client.release();
  }
});

module.exports = router;
