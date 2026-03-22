const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

router.use(auth, requireAdmin);

router.get("/leaderboard", async (_req, res) => {
  try {
    const result = await db.query(
      `WITH approved AS (
         SELECT
           sc.user_id,
           u.username,
           sc.submitted_at,
           sc.submitted_at::date AS submitted_date,
           sc.model_top1_confidence,
           CASE
             WHEN sc.final_breed_id IS NOT NULL AND sc.model_top1_breed_id IS NOT NULL
               THEN CASE WHEN sc.final_breed_id = sc.model_top1_breed_id THEN 1 ELSE 0 END
             WHEN NULLIF(TRIM(sc.final_class_name), '') IS NOT NULL
               AND NULLIF(TRIM(sc.model_top1_class_name), '') IS NOT NULL
               THEN CASE
                 WHEN LOWER(TRIM(sc.final_class_name)) = LOWER(TRIM(sc.model_top1_class_name))
                   THEN 1
                 ELSE 0
               END
             ELSE NULL
           END AS is_model_match
         FROM scan_contributions sc
         JOIN users u
           ON u.id = sc.user_id
         WHERE sc.status = 'approved'
       ),
       summary AS (
         SELECT
           a.user_id,
           MIN(a.username) AS username,
           COUNT(*)::int AS approved_count,
           ROUND(AVG(a.model_top1_confidence)::numeric, 2) AS avg_confidence,
           ROUND(
             AVG(
               CASE
                 WHEN a.is_model_match IS NULL THEN NULL
                 ELSE a.is_model_match * 100.0
               END
             )::numeric,
             2
           ) AS avg_accuracy,
           COUNT(*) FILTER (
             WHERE a.submitted_at >= NOW() - INTERVAL '7 days'
           )::int AS approved_last_7d,
           MAX(a.submitted_at) AS latest_submission_at
         FROM approved a
         GROUP BY a.user_id
       ),
       daily AS (
         SELECT
           a.user_id,
           a.submitted_date,
           COUNT(*)::int AS submitted_total
         FROM approved a
         GROUP BY a.user_id, a.submitted_date
       ),
       busiest_day AS (
         SELECT DISTINCT ON (d.user_id)
           d.user_id,
           d.submitted_date AS busiest_day,
           d.submitted_total AS busiest_day_total
         FROM daily d
         ORDER BY d.user_id, d.submitted_total DESC, d.submitted_date DESC
       )
       SELECT
         s.user_id,
         s.username,
         s.approved_count,
         s.avg_confidence,
         s.avg_accuracy,
         s.approved_last_7d,
         s.latest_submission_at,
         bd.busiest_day,
         bd.busiest_day_total
       FROM summary s
       LEFT JOIN busiest_day bd
         ON bd.user_id = s.user_id
       ORDER BY s.approved_count DESC, s.avg_accuracy DESC NULLS LAST, s.username ASC
       LIMIT 10`
    );

    const rows = result.rows.map((row, idx) => ({
      rank: idx + 1,
      user_id: Number(row.user_id),
      username: row.username,
      approved_count: Number(row.approved_count ?? 0),
      avg_confidence:
        row.avg_confidence == null ? null : Number(row.avg_confidence),
      avg_accuracy:
        row.avg_accuracy == null ? null : Number(row.avg_accuracy),
      approved_last_7d: Number(row.approved_last_7d ?? 0),
      latest_submission_at: row.latest_submission_at,
      busiest_day: row.busiest_day,
      busiest_day_total: Number(row.busiest_day_total ?? 0),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("[admin/contributors:leaderboard] Error:", err.message);
    return res.status(500).json({ error: "Failed to load admin contributors leaderboard." });
  }
});

module.exports = router;
