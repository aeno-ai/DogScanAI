const db = require("../config/database");

async function listBreedRows(queryable = db) {
  const result = await queryable.query(
    `SELECT *
     FROM breed_catalog_view
     ORDER BY breed_id`
  );
  return result.rows;
}

async function getBreedRow(breedId, queryable = db) {
  const result = await queryable.query(
    `SELECT *
     FROM breed_catalog_view
     WHERE breed_id = $1`,
    [breedId]
  );
  return result.rows[0] ?? null;
}

async function getBreedRowsByIds(breedIds, queryable = db) {
  const ids = [...new Set(breedIds.filter(Boolean).map((id) => Number(id)).filter(Number.isInteger))];
  if (!ids.length) return {};

  const result = await queryable.query(
    `SELECT *
     FROM breed_catalog_view
     WHERE breed_id = ANY($1)`,
    [ids]
  );

  return Object.fromEntries(result.rows.map((row) => [row.breed_id, row]));
}

function mapBreedCatalogRow(row) {
  return {
    breed_id: row.breed_id,
    display_name: row.display_name,
    class_name: row.class_name,
    image_url: row.image_url,
    size: row.size,
    description: row.description,
    physical_traits: {
      snout: row.snout,
      ears: row.ears,
      coat: row.coat,
      tail: row.tail,
    },
    measurements: {
      height_min: row.height_min,
      height_max: row.height_max,
      weight_min: row.weight_min,
      weight_max: row.weight_max,
    },
    characteristics: {
      lifespan_min: row.lifespan_min,
      lifespan_max: row.lifespan_max,
      origin: row.origin,
      breed_group: row.breed_group,
    },
    temperament: Array.isArray(row.temperament) ? row.temperament : [],
    health_considerations: row.health_considerations,
    key_health_tips: row.key_health_tips,
    popularity_score: row.popularity_score,
  };
}

module.exports = {
  listBreedRows,
  getBreedRow,
  getBreedRowsByIds,
  mapBreedCatalogRow,
};
