const path = require("path");
const fs = require("fs");

const pool = require("./database");

const jsonPath = path.resolve(__dirname, "../../frontend/public/image/complete_dog_breeds.json");
const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

async function upsertBreed(client, breed) {
  const temperament = Array.isArray(breed.temperament) ? breed.temperament : [];

  await client.query(
    `INSERT INTO breeds (
       breed_id, class_index, class_name, display_name, size,
       description, image_url, snout, ears, coat, tail,
       height_min, height_max, weight_min, weight_max,
       lifespan_min, lifespan_max, origin, breed_group,
       temperament, health_considerations, key_health_tips, popularity_score
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10, $11,
       $12, $13, $14, $15,
       $16, $17, $18, $19,
       $20, $21, $22, $23
     )
     ON CONFLICT (breed_id) DO UPDATE SET
       class_index = EXCLUDED.class_index,
       class_name = EXCLUDED.class_name,
       display_name = EXCLUDED.display_name,
       size = EXCLUDED.size,
       description = EXCLUDED.description,
       image_url = EXCLUDED.image_url,
       snout = EXCLUDED.snout,
       ears = EXCLUDED.ears,
       coat = EXCLUDED.coat,
       tail = EXCLUDED.tail,
       height_min = EXCLUDED.height_min,
       height_max = EXCLUDED.height_max,
       weight_min = EXCLUDED.weight_min,
       weight_max = EXCLUDED.weight_max,
       lifespan_min = EXCLUDED.lifespan_min,
       lifespan_max = EXCLUDED.lifespan_max,
       origin = EXCLUDED.origin,
       breed_group = EXCLUDED.breed_group,
       temperament = EXCLUDED.temperament,
       health_considerations = EXCLUDED.health_considerations,
       key_health_tips = EXCLUDED.key_health_tips,
       popularity_score = EXCLUDED.popularity_score,
       updated_at = NOW()`,
    [
      breed.breed_id,
      breed.class_index,
      breed.class_name,
      breed.display_name,
      breed.size,
      breed.description,
      breed.image_url,
      breed.physical_traits?.snout ?? null,
      breed.physical_traits?.ears ?? null,
      breed.physical_traits?.coat ?? null,
      breed.physical_traits?.tail ?? null,
      breed.measurements?.height_min ?? null,
      breed.measurements?.height_max ?? null,
      breed.measurements?.weight_min ?? null,
      breed.measurements?.weight_max ?? null,
      breed.characteristics?.lifespan_min ?? null,
      breed.characteristics?.lifespan_max ?? null,
      breed.characteristics?.origin ?? null,
      breed.characteristics?.breed_group ?? null,
      temperament,
      breed.health_considerations ?? null,
      breed.key_health_tips ?? null,
      breed.popularity_score ?? 0,
    ]
  );

  await client.query(
    `INSERT INTO breed_profiles (
       breed_id,
       description,
       origin,
       breed_group,
       health_considerations,
       key_health_tips,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (breed_id) DO UPDATE SET
       description = EXCLUDED.description,
       origin = EXCLUDED.origin,
       breed_group = EXCLUDED.breed_group,
       health_considerations = EXCLUDED.health_considerations,
       key_health_tips = EXCLUDED.key_health_tips,
       updated_at = NOW()`,
    [
      breed.breed_id,
      breed.description,
      breed.characteristics?.origin ?? null,
      breed.characteristics?.breed_group ?? null,
      breed.health_considerations ?? null,
      breed.key_health_tips ?? null,
    ]
  );

  await client.query(
    `INSERT INTO breed_physical_traits (
       breed_id,
       snout,
       ears,
       coat,
       tail,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (breed_id) DO UPDATE SET
       snout = EXCLUDED.snout,
       ears = EXCLUDED.ears,
       coat = EXCLUDED.coat,
       tail = EXCLUDED.tail,
       updated_at = NOW()`,
    [
      breed.breed_id,
      breed.physical_traits?.snout ?? null,
      breed.physical_traits?.ears ?? null,
      breed.physical_traits?.coat ?? null,
      breed.physical_traits?.tail ?? null,
    ]
  );

  await client.query(
    `INSERT INTO breed_measurements (
       breed_id,
       height_min,
       height_max,
       weight_min,
       weight_max,
       lifespan_min,
       lifespan_max,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (breed_id) DO UPDATE SET
       height_min = EXCLUDED.height_min,
       height_max = EXCLUDED.height_max,
       weight_min = EXCLUDED.weight_min,
       weight_max = EXCLUDED.weight_max,
       lifespan_min = EXCLUDED.lifespan_min,
       lifespan_max = EXCLUDED.lifespan_max,
       updated_at = NOW()`,
    [
      breed.breed_id,
      breed.measurements?.height_min ?? null,
      breed.measurements?.height_max ?? null,
      breed.measurements?.weight_min ?? null,
      breed.measurements?.weight_max ?? null,
      breed.characteristics?.lifespan_min ?? null,
      breed.characteristics?.lifespan_max ?? null,
    ]
  );

  await client.query(
    `DELETE FROM breed_temperaments
     WHERE breed_id = $1`,
    [breed.breed_id]
  );

  if (temperament.length) {
    const values = temperament.flatMap((value, index) => [
      breed.breed_id,
      String(value).trim(),
      index,
    ]);

    const placeholders = temperament
      .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`)
      .join(", ");

    await client.query(
      `INSERT INTO breed_temperaments (breed_id, temperament, sort_order)
       VALUES ${placeholders}`,
      values
    );
  }
}

async function importData() {
  let client;
  try {
    console.log("Starting breed import...");
    console.log(`Found ${jsonData.length} breeds to import`);

    client = await pool.connect();
    await client.query("BEGIN");

    let imported = 0;
    for (const breed of jsonData) {
      await upsertBreed(client, breed);
      imported += 1;

      if (imported % 10 === 0) {
        console.log(`Imported ${imported}/${jsonData.length} breeds...`);
      }
    }

    await client.query("COMMIT");
    console.log("Import complete.");
    console.log(`Total breeds imported: ${imported}`);

    const result = await pool.query("SELECT COUNT(*)::int AS count FROM breeds");
    console.log(`Database now contains ${result.rows[0].count} breeds`);
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {}
    }
    console.error("Import failed:", error);
  } finally {
    if (client) client.release();
    pool.end();
  }
}

importData();
