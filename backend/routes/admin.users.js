const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

router.use(auth, requireAdmin);

function normalizePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.page_size, 10) || 20));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

function validateReason(reason, required = false) {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (required && !value) return { error: "Reason is required." };
  if (value.length > 500) return { error: "Reason must be 500 characters or less." };
  return { value: value || null };
}

async function writeAudit(client, adminId, targetId, actionType, reason = null, metadata = {}) {
  await client.query(
    `INSERT INTO admin_user_actions
      (admin_user_id, target_user_id, action_type, reason, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminId, targetId, actionType, reason, metadata]
  );
}

async function fetchUserForModeration(client, userId) {
  const result = await client.query(
    `SELECT
      id, email, username, is_admin, is_superadmin,
      is_banned, banned_until, ban_reason
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

function assertModerationAllowed(actor, target) {
  if (!target) return { status: 404, error: "User not found." };
  if (Number(actor.id) === Number(target.id)) {
    return { status: 400, error: "You cannot manage your own account." };
  }
  if (target.is_superadmin) {
    return { status: 403, error: "Superadmin accounts cannot be moderated." };
  }
  if (target.is_admin && !actor.is_superadmin) {
    return { status: 403, error: "Only superadmin can manage admin accounts." };
  }
  return null;
}

router.get("/", async (req, res) => {
  const { page, pageSize, offset } = normalizePagination(req.query);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "all";

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
  }

  if (status === "active") {
    conditions.push(`NOT (u.is_banned = TRUE AND u.banned_until > NOW())`);
  } else if (status === "banned") {
    conditions.push(`(u.is_banned = TRUE AND u.banned_until > NOW())`);
  } else if (status !== "all") {
    return res.status(400).json({ error: "Invalid status filter." });
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const totalResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       ${whereClause}`,
      params
    );

    params.push(pageSize, offset);
    const listResult = await db.query(
      `SELECT
        u.id, u.email, u.username, u.created_at,
        u.is_admin, u.is_superadmin,
        u.is_banned, u.banned_until, u.ban_reason,
        u.session_version,
        COALESCE(sh.scan_count, 0)::int AS scan_count,
        sh.last_scan_at
       FROM users u
       LEFT JOIN (
         SELECT
           user_id,
           COUNT(*) AS scan_count,
           MAX(scanned_at) AS last_scan_at
         FROM scan_history
         GROUP BY user_id
       ) sh ON sh.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params
    );

    return res.json({
      pagination: {
        page,
        page_size: pageSize,
        total: totalResult.rows[0]?.total ?? 0,
      },
      data: listResult.rows.map((row) => ({
        ...row,
        is_banned_effective:
          Boolean(row.is_banned) &&
          Boolean(row.banned_until) &&
          new Date(row.banned_until).getTime() > Date.now(),
      })),
    });
  } catch (err) {
    console.error("[admin/users:list] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch users." });
  }
});

router.post("/:id/kick", async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  const reasonCheck = validateReason(req.body?.reason);
  if (reasonCheck.error) return res.status(400).json({ error: reasonCheck.error });

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const target = await fetchUserForModeration(client, targetUserId);
    const denial = assertModerationAllowed(req.user, target);
    if (denial) {
      await client.query("ROLLBACK");
      return res.status(denial.status).json({ error: denial.error });
    }

    await client.query(
      `UPDATE users
       SET session_version = session_version + 1
       WHERE id = $1`,
      [targetUserId]
    );

    await writeAudit(client, req.user.id, targetUserId, "kick", reasonCheck.value);
    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[admin/users:kick] Error:", err.message);
    return res.status(500).json({ error: "Failed to kick user." });
  } finally {
    if (client) client.release();
  }
});

router.post("/:id/ban", async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  const reasonCheck = validateReason(req.body?.reason, true);
  if (reasonCheck.error) return res.status(400).json({ error: reasonCheck.error });

  if (req.body?.until === undefined || req.body?.until === null || req.body?.until === "") {
    return res.status(400).json({ error: "Ban expiry (until) is required." });
  }

  const until = new Date(req.body.until);
  if (Number.isNaN(until.getTime())) {
    return res.status(400).json({ error: "Invalid until timestamp." });
  }
  if (until.getTime() <= Date.now()) {
    return res.status(400).json({ error: "Ban expiry must be in the future." });
  }

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const target = await fetchUserForModeration(client, targetUserId);
    const denial = assertModerationAllowed(req.user, target);
    if (denial) {
      await client.query("ROLLBACK");
      return res.status(denial.status).json({ error: denial.error });
    }

    await client.query(
      `UPDATE users
       SET is_banned = TRUE,
           banned_until = $2,
           ban_reason = $3,
           banned_at = NOW(),
           banned_by = $4,
           session_version = session_version + 1
       WHERE id = $1`,
      [targetUserId, until, reasonCheck.value, req.user.id]
    );

    await writeAudit(client, req.user.id, targetUserId, "ban", reasonCheck.value, {
      banned_until: until ? until.toISOString() : null,
    });
    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[admin/users:ban] Error:", err.message);
    return res.status(500).json({ error: "Failed to ban user." });
  } finally {
    if (client) client.release();
  }
});

router.post("/:id/unban", async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  const reasonCheck = validateReason(req.body?.reason);
  if (reasonCheck.error) return res.status(400).json({ error: reasonCheck.error });

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const target = await fetchUserForModeration(client, targetUserId);
    const denial = assertModerationAllowed(req.user, target);
    if (denial) {
      await client.query("ROLLBACK");
      return res.status(denial.status).json({ error: denial.error });
    }

    await client.query(
      `UPDATE users
       SET is_banned = FALSE,
           banned_until = NULL,
           ban_reason = NULL,
           banned_at = NULL,
           banned_by = NULL,
           session_version = session_version + 1
       WHERE id = $1`,
      [targetUserId]
    );

    await writeAudit(client, req.user.id, targetUserId, "unban", reasonCheck.value);
    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[admin/users:unban] Error:", err.message);
    return res.status(500).json({ error: "Failed to unban user." });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
