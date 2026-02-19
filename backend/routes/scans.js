// backend/routes/scans.js
// Express routes – calls Flask API for ML, then enriches with MySQL data.
require('dotenv').config({ path: './.env' });
const express   = require("express");
const router    = express.Router();
const multer    = require("multer");
const fs        = require("fs");
const path      = require("path");
const axios     = require("axios");
const db        = require("../config/database");
const auth      = require("../middleware/auth");

// ── Config ────────────────────────────────────────────────────────────────────
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

// ── Multer (memory storage – we convert to base64 for Flask) ─────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },           // 10 MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert multer buffer → base64 string (with data-URL prefix). */
function toBase64(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

/** Call Flask prediction endpoint. */
async function callFlask(endpoint, imageBase64) {
  const response = await axios.post(
    `${FLASK_URL}${endpoint}`,
    { image: imageBase64 },
    { headers: { "Content-Type": "application/json" }, timeout: 30_000 }
  );
  return response.data;
}

/** Fetch a single breed's full info from DB. */
async function getBreedFromDB(breedId) {
  const result = await db.query(
    `SELECT
        breed_id, class_index, class_name, display_name, image_url, size,
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

/** Save a scan record (non-fatal – failures are logged, not thrown). */
async function saveScan(userId, scanType, topResult, confidence) {
  if (!userId) return;
  try {
    await db.query(
      `INSERT INTO scans (user_id, scan_type, top_result, confidence, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, scanType, topResult, confidence]
    );
  } catch (err) {
    console.warn("[scans] Failed to save scan history:", err.message);
  }
}

// ── POST /api/scans/breed ─────────────────────────────────────────────────────
router.post("/breed", auth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  try {
    // 1. Call Flask
    const flaskData = await callFlask("/predict/breed", toBase64(req.file));
    if (flaskData.error) return res.status(502).json({ error: flaskData.error });

    // 2. Enrich top breeds with DB data
    const enrichedBreeds = await Promise.all(
      flaskData.top_breeds.map(async (breed) => ({
        ...breed,
        db_info: breed.breed_id ? await getBreedFromDB(breed.breed_id) : null,
      }))
    );

    // 3. Save to scan history
    const top = enrichedBreeds[0];
    await saveScan(req.user?.id, "breed", top?.display_name ?? top?.class_name, top?.confidence);

    return res.json({
      scan_type:  "breed",
      top_breeds: enrichedBreeds,
      emotion:    flaskData.emotion,
      age:        flaskData.age,
    });

  } catch (err) {
    console.error("[scans/breed] Error:", err.message, err?.response?.data);
    if (err.code === "ECONNREFUSED")
      return res.status(503).json({ error: "ML service unavailable. Start the Flask app with: python app.py" });
    const msg = err?.response?.data?.error || err.message || "Scan failed. Please try again.";
    return res.status(500).json({ error: msg });
  }
});

// ── POST /api/scans/disease ───────────────────────────────────────────────────
router.post("/disease", auth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  try {
    // 1. Call Flask
    const flaskData = await callFlask("/predict/disease", toBase64(req.file));
    if (flaskData.error) return res.status(502).json({ error: flaskData.error });

    // 2. Defensive: ensure top_diseases exists
    const topDiseases = Array.isArray(flaskData.top_diseases) ? flaskData.top_diseases : [];
    const top = topDiseases[0];

    // 3. Save to scan history
    await saveScan(req.user?.id, "disease", top?.display_name ?? top?.class_name ?? "Unknown", top?.confidence);

    return res.json({
      scan_type:    "disease",
      top_diseases: topDiseases,
    });

  } catch (err) {
    console.error("[scans/disease] Error:", err.message, err?.response?.data);
    if (err.code === "ECONNREFUSED")
      return res.status(503).json({ error: "ML service unavailable. Start the Flask app with: python app.py" });
    const msg = err?.response?.data?.error || err.message || "Scan failed. Please try again.";
    return res.status(500).json({ error: msg });
  }
});

// ── GET /api/scans/breed/:breedId ─────────────────────────────────────────────
// Called when user taps a breed result card to view full details.
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

module.exports = router;