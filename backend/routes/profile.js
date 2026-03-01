const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

const COOLDOWN_DAYS = {
  username: 30,
  email: 30,
  password: 7,
};

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function computeCooldown(lastChanged, days) {
  if (!lastChanged) {
    return {
      last_changed: null,
      can_change_after: null,
      can_change: true,
      seconds_left: 0,
    };
  }

  const lastChangedDate = new Date(lastChanged);
  const canChangeAfter = addDays(lastChangedDate, days);
  const secondsLeft = Math.max(
    0,
    Math.ceil((canChangeAfter.getTime() - Date.now()) / 1000)
  );

  return {
    last_changed: lastChangedDate.toISOString(),
    can_change_after: canChangeAfter.toISOString(),
    can_change: secondsLeft === 0,
    seconds_left: secondsLeft,
  };
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: user.created_at,
    is_admin: Boolean(user.is_admin),
    is_superadmin: Boolean(user.is_superadmin),
  };
}

function formatCooldownPayload(user) {
  return {
    username: computeCooldown(user.username_changed_at, COOLDOWN_DAYS.username),
    email: computeCooldown(user.email_changed_at, COOLDOWN_DAYS.email),
    password: computeCooldown(user.password_changed_at, COOLDOWN_DAYS.password),
  };
}

async function getUserProfileRow(client, userId) {
  const result = await client.query(
    `SELECT
      u.id,
      u.email,
      u.username,
      u.password_hash,
      u.created_at,
      u.is_admin,
      u.is_superadmin,
      u.username_changed_at,
      u.email_changed_at,
      u.password_changed_at,
      COALESCE(sh.total_scans, 0)::int AS total_scans
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) AS total_scans
       FROM scan_history
       GROUP BY user_id
     ) sh ON sh.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const user = await getUserProfileRow(db, req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({
      user: serializeUser(user),
      stats: {
        total_scans: Number(user.total_scans || 0),
      },
      cooldowns: formatCooldownPayload(user),
    });
  } catch (err) {
    console.error("[profile:get] Error:", err.message);
    return res.status(500).json({ error: "Failed to load profile." });
  }
});

router.put("/username", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const currentPassword =
    typeof req.body?.current_password === "string" ? req.body.current_password : "";

  if (!username) return res.status(400).json({ error: "Username is required.", field: "username" });
  if (username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters.", field: "username" });
  }
  if (!currentPassword) {
    return res
      .status(400)
      .json({ error: "Current password is required.", field: "current_password" });
  }

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const user = await getUserProfileRow(client, req.user.id);
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      await client.query("ROLLBACK");
      return res.status(401).json({
        error: "Current password is incorrect.",
        field: "current_password",
      });
    }

    if (username === user.username) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "New username must be different from current username.",
        field: "username",
      });
    }

    const usernameCooldown = computeCooldown(user.username_changed_at, COOLDOWN_DAYS.username);
    if (!usernameCooldown.can_change) {
      await client.query("ROLLBACK");
      return res.status(429).json({
        error: "You cannot change username yet.",
        field: "username",
        can_change_after: usernameCooldown.can_change_after,
        seconds_left: usernameCooldown.seconds_left,
      });
    }

    const exists = await client.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1`,
      [username, req.user.id]
    );
    if (exists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Username is already taken.",
        field: "username",
      });
    }

    const updatedResult = await client.query(
      `UPDATE users
       SET username = $1,
           username_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING
         id, email, username, created_at, is_admin, is_superadmin,
         username_changed_at, email_changed_at, password_changed_at`,
      [username, req.user.id]
    );

    await client.query("COMMIT");
    const updatedUser = updatedResult.rows[0];
    return res.json({
      success: true,
      user: serializeUser(updatedUser),
      cooldown: computeCooldown(updatedUser.username_changed_at, COOLDOWN_DAYS.username),
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[profile:username] Error:", err.message);
    return res.status(500).json({ error: "Failed to update username." });
  } finally {
    if (client) client.release();
  }
});

router.put("/email", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const currentPassword =
    typeof req.body?.current_password === "string" ? req.body.current_password : "";

  if (!email) return res.status(400).json({ error: "Email is required.", field: "email" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format.", field: "email" });
  }
  if (!currentPassword) {
    return res
      .status(400)
      .json({ error: "Current password is required.", field: "current_password" });
  }

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const user = await getUserProfileRow(client, req.user.id);
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      await client.query("ROLLBACK");
      return res.status(401).json({
        error: "Current password is incorrect.",
        field: "current_password",
      });
    }

    if (email === String(user.email).toLowerCase()) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "New email must be different from current email.",
        field: "email",
      });
    }

    const emailCooldown = computeCooldown(user.email_changed_at, COOLDOWN_DAYS.email);
    if (!emailCooldown.can_change) {
      await client.query("ROLLBACK");
      return res.status(429).json({
        error: "You cannot change email yet.",
        field: "email",
        can_change_after: emailCooldown.can_change_after,
        seconds_left: emailCooldown.seconds_left,
      });
    }

    const exists = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [email, req.user.id]
    );
    if (exists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Email is already in use.",
        field: "email",
      });
    }

    await client.query(
      `UPDATE users
       SET email = $1,
           email_changed_at = NOW(),
           session_version = session_version + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [email, req.user.id]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      requires_relogin: true,
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[profile:email] Error:", err.message);
    return res.status(500).json({ error: "Failed to update email." });
  } finally {
    if (client) client.release();
  }
});

router.put("/password", async (req, res) => {
  const currentPassword =
    typeof req.body?.current_password === "string" ? req.body.current_password : "";
  const newPassword = typeof req.body?.new_password === "string" ? req.body.new_password : "";

  if (!currentPassword) {
    return res
      .status(400)
      .json({ error: "Current password is required.", field: "current_password" });
  }
  if (!newPassword) {
    return res.status(400).json({ error: "New password is required.", field: "new_password" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({
      error: "New password must be at least 8 characters.",
      field: "new_password",
    });
  }

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const user = await getUserProfileRow(client, req.user.id);
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      await client.query("ROLLBACK");
      return res.status(401).json({
        error: "Current password is incorrect.",
        field: "current_password",
      });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
    if (isSameAsCurrent) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "New password must be different from current password.",
        field: "new_password",
      });
    }

    const passwordCooldown = computeCooldown(user.password_changed_at, COOLDOWN_DAYS.password);
    if (!passwordCooldown.can_change) {
      await client.query("ROLLBACK");
      return res.status(429).json({
        error: "You cannot change password yet.",
        field: "new_password",
        can_change_after: passwordCooldown.can_change_after,
        seconds_left: passwordCooldown.seconds_left,
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
      [passwordHash, req.user.id]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      requires_relogin: true,
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[profile:password] Error:", err.message);
    return res.status(500).json({ error: "Failed to update password." });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
