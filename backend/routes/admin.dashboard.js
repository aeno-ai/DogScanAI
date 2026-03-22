const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

router.use(auth, requireAdmin);

function buildRange(range) {
  const now = new Date();
  const allowed = new Set(["7d", "30d", "all"]);
  const value = allowed.has(range) ? range : "30d";

  if (value === "all") {
    return {
      range: value,
      from: null,
      to: now,
    };
  }

  const from = new Date(now);
  from.setDate(from.getDate() - (value === "7d" ? 7 : 30));
  return {
    range: value,
    from,
    to: now,
  };
}

router.get("/", async (req, res) => {
  const period = buildRange(typeof req.query.range === "string" ? req.query.range.trim() : "30d");
  const scansFilterSql = period.from ? "WHERE sh.scanned_at >= $1" : "";
  const scansFilterParams = period.from ? [period.from] : [];

  try {
    const [
      usersResult,
      scansResult,
      last24Result,
      seriesResult,
      topBreedsResult,
      recentScansResult,
      publicUsageResult,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total_users FROM users`),
      db.query(
        `SELECT
          COUNT(*)::int AS total_scans,
          COUNT(*) FILTER (WHERE sh.scan_type = 'breed')::int AS breed_scans,
          COUNT(*) FILTER (WHERE sh.scan_type = 'disease')::int AS disease_scans
         FROM scan_history sh
         ${scansFilterSql}`,
        scansFilterParams
      ),
      db.query(
        `SELECT COUNT(*)::int AS scans_last_24h
         FROM scan_history
         WHERE scanned_at >= NOW() - INTERVAL '24 hours'`
      ),
      db.query(
        `SELECT
          DATE_TRUNC('day', sh.scanned_at)::date AS date,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE sh.scan_type = 'breed')::int AS breed,
          COUNT(*) FILTER (WHERE sh.scan_type = 'disease')::int AS disease,
          ROUND(AVG(sp.confidence)::numeric, 2) AS avg_confidence,
          ROUND(
            AVG(
              CASE
                WHEN sc.status = 'approved'
                 AND sc.final_breed_id IS NOT NULL
                 AND sc.model_top1_breed_id IS NOT NULL
                  THEN CASE WHEN sc.final_breed_id = sc.model_top1_breed_id THEN 100.0 ELSE 0.0 END
                WHEN sc.status = 'approved'
                 AND NULLIF(TRIM(sc.final_class_name), '') IS NOT NULL
                 AND NULLIF(TRIM(sc.model_top1_class_name), '') IS NOT NULL
                  THEN CASE
                    WHEN LOWER(TRIM(sc.final_class_name)) = LOWER(TRIM(sc.model_top1_class_name))
                      THEN 100.0
                    ELSE 0.0
                  END
                ELSE NULL
              END
            )::numeric,
            2
          ) AS avg_accuracy,
          COUNT(*) FILTER (WHERE sc.status = 'approved')::int AS approved_contribution_count
         FROM scan_history sh
         LEFT JOIN scan_predictions sp
           ON sp.scan_id = sh.id
          AND sp.rank = 1
         LEFT JOIN scan_contributions sc
           ON sc.scan_id = sh.id
         ${scansFilterSql}
         GROUP BY DATE_TRUNC('day', sh.scanned_at)
         ORDER BY date ASC`,
        scansFilterParams
      ),
      db.query(
        `SELECT
          COALESCE(b.breed_id, sp.breed_id) AS breed_id,
          COALESCE(b.display_name, sp.display_name) AS name,
          COUNT(*)::int AS scan_count,
         ROUND(AVG(sp.confidence)::numeric, 2) AS avg_confidence
         FROM scan_predictions sp
         JOIN scan_history sh ON sh.id = sp.scan_id
         LEFT JOIN breed_catalog_view b ON b.breed_id = sp.breed_id
         WHERE sp.rank = 1
           AND sp.breed_id IS NOT NULL
           ${period.from ? "AND sh.scanned_at >= $1" : ""}
         GROUP BY COALESCE(b.breed_id, sp.breed_id), COALESCE(b.display_name, sp.display_name)
         ORDER BY scan_count DESC, name ASC
         LIMIT 5`,
        scansFilterParams
      ),
      db.query(
        `SELECT
          sh.id AS scan_id,
          sh.scanned_at,
          sh.scan_type,
          sh.image_url,
          sh.user_id,
          u.username,
          sp.display_name AS top_prediction_name,
          sp.confidence AS top_prediction_confidence
         FROM scan_history sh
         JOIN users u ON u.id = sh.user_id
         LEFT JOIN scan_predictions sp
           ON sp.scan_id = sh.id AND sp.rank = 1
         ${scansFilterSql}
         ORDER BY sh.scanned_at DESC
         LIMIT 10`,
        scansFilterParams
      ),
      db.query(
        `SELECT
          COALESCE(SUM(used_count), 0)::int AS consumed_scans,
          COUNT(*)::int AS active_devices
         FROM public_scan_usage
         ${period.from ? "WHERE period_start >= $1::date" : ""}`,
        period.from ? [period.from.toISOString().slice(0, 10)] : []
      ),
    ]);

    const scansMetrics = scansResult.rows[0] ?? {};
    const publicUsage = publicUsageResult.rows[0] ?? {};

    return res.json({
      period: {
        range: period.range,
        from: period.from ? period.from.toISOString().slice(0, 10) : null,
        to: period.to.toISOString().slice(0, 10),
      },
      kpis: {
        total_users: usersResult.rows[0]?.total_users ?? 0,
        total_scans: scansMetrics.total_scans ?? 0,
        breed_scans: scansMetrics.breed_scans ?? 0,
        disease_scans: scansMetrics.disease_scans ?? 0,
        scans_last_24h: last24Result.rows[0]?.scans_last_24h ?? 0,
      },
      scans_by_day: seriesResult.rows.map((row) => ({
        date: row.date,
        total: row.total,
        breed: row.breed,
        disease: row.disease,
        avg_confidence:
          row.avg_confidence == null ? null : Number(row.avg_confidence),
        avg_accuracy:
          row.avg_accuracy == null ? null : Number(row.avg_accuracy),
        approved_contribution_count: Number(row.approved_contribution_count ?? 0),
      })),
      top_breeds: topBreedsResult.rows,
      recent_scans: recentScansResult.rows,
      public_usage: {
        period_start: period.from ? period.from.toISOString().slice(0, 10) : null,
        active_devices: publicUsage.active_devices ?? 0,
        consumed_scans: publicUsage.consumed_scans ?? 0,
      },
    });
  } catch (err) {
    console.error("[admin/dashboard] Error:", err.message);
    return res.status(500).json({ error: "Failed to load dashboard data." });
  }
});

module.exports = router;
