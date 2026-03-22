const express = require("express");

const pool = require("../config/database");
const { getBreedRow, listBreedRows, mapBreedCatalogRow } = require("../utils/breeds");

const router = express.Router();

// GET /api/breeds - Get all breeds
router.get("/breeds", async (_req, res) => {
  try {
    const rows = await listBreedRows(pool);
    const breeds = rows.map(mapBreedCatalogRow);
    return res.json(breeds);
  } catch (error) {
    console.error("[breeds:list] Error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
});

// GET /api/breeds/:id - Get single breed
router.get("/breeds/:id", async (req, res) => {
  try {
    const breedId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({ error: "Invalid breed id" });
    }

    const breed = await getBreedRow(breedId, pool);
    if (!breed) {
      return res.status(404).json({ error: "Breed not found" });
    }

    return res.json(breed);
  } catch (error) {
    console.error("[breeds:get] Error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
