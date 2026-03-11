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
  return res.status(500).json({ error: "Failed to load contributors leaderboard." });
}

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
      rank: idx + 1,
      username: row.username,
      approved_count: Number(row.approved_count ?? 0),
    }));

    return res.json(rows);
  } catch (err) {
    return handleDbError(err, res, "contributors:leaderboard");
  }
});

module.exports = router;
