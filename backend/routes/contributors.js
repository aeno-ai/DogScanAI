const express = require("express");
const db = require("../config/database");

const router = express.Router();

const DB_UNAVAILABLE_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "57P01", "57P02", "57P03"]);

function isDbUnavailable(err) {
  return DB_UNAVAILABLE_CODES.has(err?.code);
}

function handleDbError(err, res, context) {
  if (isDbUnavailable(err)) {
    return res.status(503).json({ error: "Database unavailable. Please try again." });
  }
  if (err?.code === "42P01") {
    return res.status(500).json({ error: "Contribution tables missing. Run migrations first." });
  }
  console.error(`[${context}] Error:`, err.message);
  return res.status(500).json({ error: "Internal server error." });
}

// =============================================================
// GET /api/contributors/leaderboard
// Top 10 users with most approved contributions — no auth needed
// =============================================================
router.get("/leaderboard", async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT
         u.username,
         COUNT(*)::int AS approved_count
       FROM scan_contributions sc
       JOIN users u ON u.id = sc.user_id
       WHERE sc.status = 'approved'
       GROUP BY u.id, u.username
       ORDER BY approved_count DESC, u.username ASC
       LIMIT 10`
    );

    const rows = result.rows.map((row, idx) => ({
      rank:           idx + 1,
      username:       row.username,
      approved_count: Number(row.approved_count ?? 0),
    }));

    return res.json(rows);
  } catch (err) {
    return handleDbError(err, res, "contributors:leaderboard");
  }
});

// =============================================================
// GET /api/contributors/my-stats
// Logged-in user's approved count, pending count, and rank
// =============================================================
router.get("/my-stats", async (req, res) => {
  // Support both Bearer token auth and session auth
  const auth = require("../middleware/auth");
  return auth(req, res, async () => {
    const userId = req.user?.userId ?? req.user?.id;

    try {
      // Approved count for this user
      const countResult = await db.query(
        `SELECT COUNT(*)::int AS approved_count
         FROM scan_contributions
         WHERE user_id = $1 AND status = 'approved'`,
        [userId]
      );
      const approvedCount = countResult.rows[0]?.approved_count ?? 0;

      // Pending count
      const pendingResult = await db.query(
        `SELECT COUNT(*)::int AS pending_count
         FROM scan_contributions
         WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );
      const pendingCount = pendingResult.rows[0]?.pending_count ?? 0;

      // Rank among all contributors
      const rankResult = await db.query(
        `SELECT rank FROM (
           SELECT
             user_id,
             RANK() OVER (ORDER BY COUNT(*) DESC) AS rank
           FROM scan_contributions
           WHERE status = 'approved'
           GROUP BY user_id
         ) ranked
         WHERE user_id = $1`,
        [userId]
      );
      const rank = rankResult.rows[0]?.rank ? Number(rankResult.rows[0].rank) : null;

      return res.json({
        approved_count: approvedCount,
        pending_count:  pendingCount,
        rank,
      });
    } catch (err) {
      return handleDbError(err, res, "contributors:my-stats");
    }
  });
});

module.exports = router;