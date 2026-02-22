const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const fs = require("fs/promises");
const crypto = require("crypto");
const multer = require("multer");
const axios = require("axios");

const router = express.Router();
const db = require("../config/database");
const auth = require("../middleware/auth");

const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";
const DB_UNAVAILABLE_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "57P01", "57P02", "57P03"]);
const SCAN_UPLOAD_DIR = path.resolve(__dirname, "../uploads/scans");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

function toBase64(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

async function callFlask(endpoint, imageBase64) {
  const response = await axios.post(
    `${FLASK_URL}${endpoint}`,
    { image: imageBase64 },
    { headers: { "Content-Type": "application/json" }, timeout: 30000 }
  );
  return response.data;
}

async function getBreedFromDB(breedId) {
  const result = await db.query(
    `SELECT
      breed_id, class_name, display_name, image_url, size,
      description, snout, ears, coat, tail,
      height_min, height_max, weight_min, weight_max,
      lifespan_min, lifespan_max, origin, breed_group, temperament,
      health_considerations, key_health_tips, popularity_score
     FROM breeds
     WHERE breed_id = $1`,
    [breedId]
  );
  return result.rows[0] ?? null;
}

function getAuthUserId(req) {
  return req.user?.userId ?? req.user?.id ?? null;
}

function normalizePredictions(predictions) {
  if (!Array.isArray(predictions)) return [];

  return predictions
    .map((pred, idx) => {
      const rank = Number(pred?.rank);
      const rawConfidence = pred?.confidence;
      const parsedConfidence =
        typeof rawConfidence === "string"
          ? Number.parseFloat(rawConfidence.replace("%", ""))
          : Number(rawConfidence);
      const confidence =
        Number.isFinite(parsedConfidence) && parsedConfidence <= 1
          ? parsedConfidence * 100
          : parsedConfidence;
      const breedId = pred?.breed_id == null ? null : Number(pred.breed_id);
      const rawClassName =
        typeof pred?.class_name === "string" ? pred.class_name.trim() : "";
      const rawDisplayName =
        typeof pred?.display_name === "string" ? pred.display_name.trim() : "";
      const className = rawClassName || rawDisplayName || `prediction_${idx + 1}`;
      const displayName = rawDisplayName || rawClassName || `Prediction ${idx + 1}`;

      return {
        rank,
        confidence,
        breed_id: Number.isInteger(breedId) ? breedId : null,
        class_name: className,
        display_name: displayName,
      };
    })
    .filter(
      (pred) =>
        Number.isInteger(pred.rank) &&
        pred.rank >= 1 &&
        pred.rank <= 10 &&
        pred.class_name.length > 0 &&
        pred.display_name.length > 0 &&
        Number.isFinite(pred.confidence) &&
        pred.confidence >= 0 &&
        pred.confidence <= 100
    )
    .sort((a, b) => a.rank - b.rank);
}

function hasDuplicateRanks(predictions) {
  const seen = new Set();
  for (const pred of predictions) {
    if (seen.has(pred.rank)) return true;
    seen.add(pred.rank);
  }
  return false;
}

function isDbUnavailable(err) {
  return DB_UNAVAILABLE_CODES.has(err?.code);
}

function resolveImageExtension(file) {
  const originalExt = path.extname(file?.originalname || "").toLowerCase();
  if (originalExt) return originalExt;

  const mimeToExt = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

  return mimeToExt[file?.mimetype] || ".jpg";
}

async function saveUploadedScanImage(file, req) {
  if (!file) return null;

  await fs.mkdir(SCAN_UPLOAD_DIR, { recursive: true });
  const ext = resolveImageExtension(file);
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const filepath = path.join(SCAN_UPLOAD_DIR, filename);

  await fs.writeFile(filepath, file.buffer);

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/scans/${filename}`;
}

router.post("/breed", auth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  try {
    const flaskData = await callFlask("/predict/breed", toBase64(req.file));
    if (flaskData.error) return res.status(502).json({ error: flaskData.error });

    let uploadedImageUrl = null;
    try {
      uploadedImageUrl = await saveUploadedScanImage(req.file, req);
    } catch (saveErr) {
      console.warn("[scans/breed] Failed to persist uploaded image:", saveErr.message);
    }

    const enrichedBreeds = await Promise.all(
      flaskData.top_breeds.map(async (breed) => ({
        ...breed,
        db_info: breed.breed_id ? await getBreedFromDB(breed.breed_id) : null,
      }))
    );

    return res.json({
      scan_type: "breed",
      top_breeds: enrichedBreeds,
      emotion: flaskData.emotion,
      age: flaskData.age,
      uploaded_image_url: uploadedImageUrl,
    });
  } catch (err) {
    console.error("[scans/breed] Error:", err.message, err?.response?.data);
    if (err.code === "ECONNREFUSED") {
      return res
        .status(503)
        .json({ error: "ML service unavailable. Start the Flask app with: python app.py" });
    }
    const msg = err?.response?.data?.error || err.message || "Scan failed. Please try again.";
    return res.status(500).json({ error: msg });
  }
});

router.post("/disease", auth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  try {
    const flaskData = await callFlask("/predict/disease", toBase64(req.file));
    if (flaskData.error) return res.status(502).json({ error: flaskData.error });

    let uploadedImageUrl = null;
    try {
      uploadedImageUrl = await saveUploadedScanImage(req.file, req);
    } catch (saveErr) {
      console.warn("[scans/disease] Failed to persist uploaded image:", saveErr.message);
    }

    const topDiseasesRaw = Array.isArray(flaskData.top_diseases) ? flaskData.top_diseases : [];
    const totalDiseaseConfidence = topDiseasesRaw.reduce(
      (sum, disease) => sum + Number(disease?.confidence ?? 0),
      0
    );
    const topDiseases = topDiseasesRaw.map((disease) => ({
      ...disease,
      mix_share:
        totalDiseaseConfidence > 0
          ? Number(((Number(disease?.confidence ?? 0) / totalDiseaseConfidence) * 100).toFixed(1))
          : 0,
    }));

    return res.json({
      scan_type: "disease",
      top_diseases: topDiseases,
      uploaded_image_url: uploadedImageUrl,
    });
  } catch (err) {
    console.error("[scans/disease] Error:", err.message, err?.response?.data);
    if (err.code === "ECONNREFUSED") {
      return res
        .status(503)
        .json({ error: "ML service unavailable. Start the Flask app with: python app.py" });
    }
    const msg = err?.response?.data?.error || err.message || "Scan failed. Please try again.";
    return res.status(500).json({ error: msg });
  }
});

router.get("/breed/:breedId", async (req, res) => {
  try {
    const data = await getBreedFromDB(req.params.breedId);
    if (!data) return res.status(404).json({ error: "Breed not found" });
    return res.json(data);
  } catch (err) {
    console.error("[scans/breed/:id] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch breed details." });
  }
});

router.post("/", auth, upload.single("image"), async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  let imageUrl = typeof req.body?.image_url === "string" ? req.body.image_url.trim() : "";

  let rawPredictions = req.body?.predictions;
  if (typeof rawPredictions === "string") {
    try {
      rawPredictions = JSON.parse(rawPredictions);
    } catch {
      return res.status(400).json({ error: "predictions must be valid JSON" });
    }
  }

  if (!imageUrl && req.file) {
    try {
      imageUrl = await saveUploadedScanImage(req.file, req);
    } catch (saveErr) {
      console.error("[scans:create] Failed to save uploaded image:", saveErr.message);
      return res.status(500).json({ error: "Failed to store uploaded image" });
    }
  }

  const predictions = normalizePredictions(rawPredictions);

  if (!imageUrl) {
    return res.status(400).json({ error: "image_url is required" });
  }
  if (predictions.length === 0) {
    return res.status(400).json({ error: "predictions must contain at least one valid item" });
  }
  if (hasDuplicateRanks(predictions)) {
    return res.status(400).json({ error: "predictions contain duplicate rank values" });
  }

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const historyResult = await client.query(
      `INSERT INTO scan_history (user_id, image_url)
       VALUES ($1, $2)
       RETURNING id, scanned_at`,
      [userId, imageUrl]
    );

    const scanId = historyResult.rows[0].id;
    for (const pred of predictions) {
      await client.query(
        `INSERT INTO scan_predictions
          (scan_id, rank, breed_id, class_name, display_name, confidence)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [scanId, pred.rank, pred.breed_id, pred.class_name, pred.display_name, pred.confidence]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({
      scan_id: scanId,
      scanned_at: historyResult.rows[0].scanned_at,
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    if (err.code === "23505") {
      return res.status(400).json({ error: "Duplicate prediction rank for scan" });
    }
    if (err.code === "23503") {
      return res.status(400).json({ error: "Invalid breed_id reference" });
    }
    if (isDbUnavailable(err)) {
      return res.status(503).json({ error: "Database unavailable. Please try again." });
    }
    if (err.code === "42P01") {
      return res.status(500).json({ error: "History tables missing. Run migrations first." });
    }
    console.error("[scans:create] Error:", err.message);
    return res.status(500).json({ error: "Failed to save scan history" });
  } finally {
    if (client) client.release();
  }
});

router.get("/", auth, async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const result = await db.query(
      `SELECT
        sh.id AS scan_id,
        sh.image_url,
        sh.scanned_at,
        sp.id AS prediction_id,
        sp.rank,
        sp.breed_id,
        sp.class_name,
        sp.display_name,
        sp.confidence,
        b.size,
        b.origin,
        b.breed_group,
        b.description,
        b.temperament,
        b.height_min,
        b.height_max,
        b.weight_min,
        b.weight_max,
        b.lifespan_min,
        b.lifespan_max,
        b.snout,
        b.ears,
        b.coat,
        b.tail,
        b.health_considerations,
        b.key_health_tips
       FROM scan_history sh
       LEFT JOIN scan_predictions sp
         ON sp.scan_id = sh.id
       LEFT JOIN breeds b
         ON b.breed_id = sp.breed_id
       WHERE sh.user_id = $1
       ORDER BY sh.scanned_at DESC, sh.id DESC, sp.rank ASC`,
      [userId]
    );

    const scansById = new Map();
    for (const row of result.rows) {
      if (!scansById.has(row.scan_id)) {
        scansById.set(row.scan_id, {
          id: row.scan_id,
          image_url: row.image_url,
          scanned_at: row.scanned_at,
          predictions: [],
        });
      }

      if (row.prediction_id) {
        scansById.get(row.scan_id).predictions.push({
          id: row.prediction_id,
          rank: row.rank,
          breed_id: row.breed_id,
          class_name: row.class_name,
          display_name: row.display_name,
          confidence: Number(row.confidence),
          breed_info: {
            size: row.size,
            origin: row.origin,
            breed_group: row.breed_group,
            description: row.description,
            temperament: row.temperament,
            height_min: row.height_min,
            height_max: row.height_max,
            weight_min: row.weight_min,
            weight_max: row.weight_max,
            lifespan_min: row.lifespan_min,
            lifespan_max: row.lifespan_max,
            snout: row.snout,
            ears: row.ears,
            coat: row.coat,
            tail: row.tail,
            health_considerations: row.health_considerations,
            key_health_tips: row.key_health_tips,
          },
        });
      }
    }

    return res.json(Array.from(scansById.values()));
  } catch (err) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({ error: "Database unavailable. Please try again." });
    }
    if (err.code === "42P01") {
      console.warn("[scans:list] History tables missing. Returning empty list.");
      return res.json([]);
    }
    console.error("[scans:list] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch scan history" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const scanId = Number(req.params.id);
  if (!Number.isInteger(scanId) || scanId <= 0) {
    return res.status(400).json({ error: "Invalid scan id" });
  }

  try {
    const ownership = await db.query(
      `SELECT id FROM scan_history WHERE id = $1 AND user_id = $2`,
      [scanId, userId]
    );
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: "Scan not found" });
    }

    await db.query(`DELETE FROM scan_history WHERE id = $1`, [scanId]);
    return res.json({ success: true });
  } catch (err) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({ error: "Database unavailable. Please try again." });
    }
    if (err.code === "42P01") {
      return res.status(500).json({ error: "History tables missing. Run migrations first." });
    }
    console.error("[scans:delete] Error:", err.message);
    return res.status(500).json({ error: "Failed to delete scan" });
  }
});

module.exports = router;
