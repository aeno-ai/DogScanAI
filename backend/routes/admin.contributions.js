const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const {
  replaceApprovedSamplePredictions,
  upsertContributionReview,
} = require("../utils/contribution-helpers");

const router = express.Router();

const APPROVED_UPLOAD_DIR = path.resolve(__dirname, "../uploads/approved");
const SUPPORTED_STATUSES = new Set(["pending", "approved", "rejected", "all"]);

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

function normalizeReason(value, required = false) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (required && !reason) return { error: "Reason is required." };
  if (reason.length > 500) return { error: "Reason must be 500 characters or less." };
  return { value: reason || null };
}

async function writeAudit(client, adminId, targetUserId, actionType, reason = null, metadata = {}) {
  await client.query(
    `INSERT INTO admin_user_actions
      (admin_user_id, target_user_id, action_type, reason, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminId, targetUserId, actionType, reason, metadata]
  );
}

function resolveSourceImagePath(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) return null;
  const raw = imageUrl.trim();

  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return path.resolve(__dirname, "..", raw.replace(/^\/+/, ""));
  }

  try {
    const parsed = new URL(raw);
    return path.resolve(__dirname, "..", parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function getImageExt(imageUrl) {
  const ext = path.extname(imageUrl || "").toLowerCase();
  if (ext) return ext;
  return ".jpg";
}

async function copyToApprovedStorage(imageUrl, req) {
  const sourcePath = resolveSourceImagePath(imageUrl);
  if (!sourcePath) throw new Error("Unable to resolve source image path.");

  await fs.mkdir(APPROVED_UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}${getImageExt(imageUrl)}`;
  const destPath = path.join(APPROVED_UPLOAD_DIR, filename);

  await fs.copyFile(sourcePath, destPath);
  return `${req.protocol}://${req.get("host")}/uploads/approved/${filename}`;
}

router.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "pending";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const { page, pageSize, offset } = normalizePagination(req.query);

  if (!SUPPORTED_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid status filter." });
  }

  const where = [];
  const params = [];

  if (status !== "all") {
    params.push(status);
    where.push(`sc.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR sc.model_top1_display_name ILIKE $${params.length})`
    );
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const totalResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM scan_contribution_records_view sc
       JOIN users u ON u.id = sc.user_id
       ${whereClause}`,
      params
    );

    params.push(pageSize, offset);
    const listResult = await db.query(
      `SELECT
        sc.id,
        sc.scan_id,
        sc.user_id,
        sc.status,
        sc.source_image_url,
        sc.model_top1_breed_id,
        sc.model_top1_class_name,
        sc.model_top1_display_name,
        sc.model_top1_confidence,
        sc.submitted_at,
        sc.reviewed_at,
        sc.review_reason,
        sc.final_breed_id,
        sc.final_class_name,
        sc.final_display_name,
        u.username,
        u.email,
        reviewer.username AS reviewed_by_username
       FROM scan_contribution_records_view sc
       JOIN users u ON u.id = sc.user_id
       LEFT JOIN users reviewer ON reviewer.id = sc.reviewed_by
       ${whereClause}
       ORDER BY sc.submitted_at DESC, sc.id DESC
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
      data: listResult.rows,
    });
  } catch (err) {
    console.error("[admin/contributions:list] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch contributions." });
  }
});

router.get("/:id", async (req, res) => {
  const contributionId = Number(req.params.id);
  if (!Number.isInteger(contributionId) || contributionId <= 0) {
    return res.status(400).json({ error: "Invalid contribution id." });
  }

  try {
    const result = await db.query(
      `SELECT
        sc.*,
        u.username,
        u.email,
        reviewer.username AS reviewed_by_username
       FROM scan_contribution_records_view sc
       JOIN users u ON u.id = sc.user_id
       LEFT JOIN users reviewer ON reviewer.id = sc.reviewed_by
       WHERE sc.id = $1`,
      [contributionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contribution not found." });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("[admin/contributions:get] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch contribution." });
  }
});

router.post("/:id/approve", async (req, res) => {
  const contributionId = Number(req.params.id);
  const finalBreedId = Number(req.body?.final_breed_id);
  const noteCheck = normalizeReason(req.body?.note);

  if (!Number.isInteger(contributionId) || contributionId <= 0) {
    return res.status(400).json({ error: "Invalid contribution id." });
  }
  if (!Number.isInteger(finalBreedId) || finalBreedId <= 0) {
    return res.status(400).json({ error: "final_breed_id is required." });
  }
  if (noteCheck.error) return res.status(400).json({ error: noteCheck.error });

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const contributionResult = await client.query(
      `SELECT *
       FROM scan_contributions
       WHERE id = $1
       FOR UPDATE`,
      [contributionId]
    );
    if (contributionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Contribution not found." });
    }

    const contribution = contributionResult.rows[0];
    if (contribution.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Only pending contributions can be approved." });
    }

    const contributionViewResult = await client.query(
      `SELECT *
       FROM scan_contribution_records_view
       WHERE id = $1`,
      [contributionId]
    );
    const contributionRecord = contributionViewResult.rows[0];
    if (!contributionRecord) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Normalized contribution view is unavailable." });
    }

    const breedResult = await client.query(
      `SELECT breed_id, class_name, display_name
       FROM breeds
       WHERE breed_id = $1`,
      [finalBreedId]
    );
    if (breedResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "final_breed_id does not exist." });
    }
    const breed = breedResult.rows[0];

    const approvedImageUrl = await copyToApprovedStorage(contributionRecord.source_image_url, req);

    await client.query(
      `UPDATE scan_contributions
       SET status = 'approved',
           reviewed_at = NOW(),
           reviewed_by = $2,
           review_reason = $3,
           final_breed_id = $4,
           final_class_name = $5,
           final_display_name = $6
       WHERE id = $1`,
      [
        contributionId,
        req.user.id,
        noteCheck.value,
        breed.breed_id,
        breed.class_name,
        breed.display_name,
      ]
    );
    await upsertContributionReview(client, {
      contributionId,
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
      reviewReason: noteCheck.value,
      finalBreedId: breed.breed_id,
      finalClassName: breed.class_name,
      finalDisplayName: breed.display_name,
    });

    const approvedSampleResult = await client.query(
      `INSERT INTO approved_samples
        (
          contribution_id, user_id, scan_id,
          approved_image_url, original_image_url,
          final_breed_id, final_class_name, final_display_name,
          original_predictions, approved_by, note
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
       RETURNING id`,
      [
        contributionRecord.id,
        contributionRecord.user_id,
        contributionRecord.scan_id,
        approvedImageUrl,
        contributionRecord.source_image_url,
        breed.breed_id,
        breed.class_name,
        breed.display_name,
        JSON.stringify(contributionRecord.original_predictions),
        req.user.id,
        noteCheck.value,
      ]
    );
    await replaceApprovedSamplePredictions(
      client,
      approvedSampleResult.rows[0].id,
      contributionRecord.original_predictions
    );

    await writeAudit(client, req.user.id, contribution.user_id, "approve_contribution", noteCheck.value, {
      contribution_id: contributionRecord.id,
      final_breed_id: breed.breed_id,
    });

    await client.query("COMMIT");
    return res.json({ success: true, approved_image_url: approvedImageUrl });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[admin/contributions:approve] Error:", err.message);
    return res.status(500).json({ error: "Failed to approve contribution." });
  } finally {
    if (client) client.release();
  }
});

router.post("/:id/reject", async (req, res) => {
  const contributionId = Number(req.params.id);
  const reasonCheck = normalizeReason(req.body?.reason, true);

  if (!Number.isInteger(contributionId) || contributionId <= 0) {
    return res.status(400).json({ error: "Invalid contribution id." });
  }
  if (reasonCheck.error) return res.status(400).json({ error: reasonCheck.error });

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const contributionResult = await client.query(
      `SELECT id, user_id, status
       FROM scan_contributions
       WHERE id = $1
       FOR UPDATE`,
      [contributionId]
    );
    if (contributionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Contribution not found." });
    }
    const contribution = contributionResult.rows[0];

    if (contribution.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Only pending contributions can be rejected." });
    }

    await client.query(
      `UPDATE scan_contributions
       SET status = 'rejected',
           reviewed_at = NOW(),
           reviewed_by = $2,
           review_reason = $3,
           final_breed_id = NULL,
           final_class_name = NULL,
           final_display_name = NULL
       WHERE id = $1`,
      [contributionId, req.user.id, reasonCheck.value]
    );
    await upsertContributionReview(client, {
      contributionId,
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
      reviewReason: reasonCheck.value,
      finalBreedId: null,
      finalClassName: null,
      finalDisplayName: null,
    });

    await writeAudit(client, req.user.id, contribution.user_id, "reject_contribution", reasonCheck.value, {
      contribution_id: contributionId,
    });

    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("[admin/contributions:reject] Error:", err.message);
    return res.status(500).json({ error: "Failed to reject contribution." });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
