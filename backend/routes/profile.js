const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const auth = require("../middleware/auth");
const {
  getPasswordValidationError,
  getUserLoginStateById,
  serializeUser,
  upsertPasswordCredential,
} = require("../utils/auth-helpers");

const router = express.Router();

const COOLDOWN_DAYS = {
  username: 30,
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

function formatCooldownPayload(user) {
  return {
    username: computeCooldown(user.username_changed_at, COOLDOWN_DAYS.username),
    password: computeCooldown(user.password_changed_at, COOLDOWN_DAYS.password)
  };
}

async function getUserProfileRow(client, userId) {
  const user = await getUserLoginStateById(client, userId);
  if (!user) return null;

  const statsResult = await client.query(
    `SELECT COUNT(*)::int AS total_scans
     FROM scan_history
     WHERE user_id = $1`,
    [userId]
  );

  return {
    ...user,
    total_scans: Number(statsResult.rows[0]?.total_scans || 0),
  };
}

async function requireCurrentPasswordIfNeeded(client, user, currentPassword) {
  if (!user?.has_password) {
    return null;
  }

  if (!currentPassword) {
    return {
      status: 400,
      payload: {
        error: "Current password is required.",
        field: "current_password",
      },
    };
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    return {
      status: 401,
      payload: {
        error: "Current password is incorrect.",
        field: "current_password",
      },
    };
  }

  return null;
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
    return res.status(400).json({
      error: "Username must be at least 3 characters.",
      field: "username",
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

    const passwordRequirement = await requireCurrentPasswordIfNeeded(
      client,
      user,
      currentPassword
    );
    if (passwordRequirement) {
      await client.query("ROLLBACK");
      return res.status(passwordRequirement.status).json(passwordRequirement.payload);
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
       RETURNING id`,
      [username, req.user.id]
    );

    const updatedUser = await getUserProfileRow(client, updatedResult.rows[0].id);
    await client.query("COMMIT");

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

router.put("/password", async (req, res) => {
  const currentPassword =
    typeof req.body?.current_password === "string" ? req.body.current_password : "";
  const newPassword = typeof req.body?.new_password === "string" ? req.body.new_password : "";

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required.", field: "new_password" });
  }
  const passwordValidationError = getPasswordValidationError(
    newPassword,
    "New password"
  );
  if (passwordValidationError) {
    return res.status(400).json({
      error: passwordValidationError,
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

    const passwordRequirement = await requireCurrentPasswordIfNeeded(
      client,
      user,
      currentPassword
    );
    if (passwordRequirement) {
      await client.query("ROLLBACK");
      return res.status(passwordRequirement.status).json(passwordRequirement.payload);
    }

    if (user.has_password) {
      const isSameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
      if (isSameAsCurrent) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "New password must be different from current password.",
          field: "new_password",
        });
      }
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
    await upsertPasswordCredential(client, req.user.id, passwordHash);
    await client.query(
      `UPDATE users
       SET password_changed_at = NOW(),
           session_version = session_version + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [req.user.id]
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
