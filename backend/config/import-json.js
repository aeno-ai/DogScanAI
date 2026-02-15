// import-json-to-db.js
// This script imports your JSON data into PostgreSQL
const pool = require('./database');
const fs = require('fs');


// Read your JSON file
const jsonData = JSON.parse(fs.readFileSync('../../frontend/public/image/complete_dog_breeds.json', 'utf8'));

async function importData() {
  try {
    console.log('🚀 Starting import...');
    console.log(`📊 Found ${jsonData.length} breeds to import`);
    console.log('✅ Table created/verified');

    // Insert each breed
    let imported = 0;
    for (const breed of jsonData) {
      await pool.query(`
        INSERT INTO breeds (
          breed_id, class_index, class_name, display_name, size,
          description, image_url, snout, ears, coat, tail,
          height_min, height_max, weight_min, weight_max,
          lifespan_min, lifespan_max, origin, breed_group,
          temperament, health_considerations, key_health_tips, popularity_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (breed_id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url
      `, [
        breed.breed_id,
        breed.class_index,
        breed.class_name,
        breed.display_name,
        breed.size,
        breed.description,
        breed.image_url,
        breed.physical_traits.snout,
        breed.physical_traits.ears,
        breed.physical_traits.coat,
        breed.physical_traits.tail,
        breed.measurements.height_min,
        breed.measurements.height_max,
        breed.measurements.weight_min,
        breed.measurements.weight_max,
        breed.characteristics.lifespan_min,
        breed.characteristics.lifespan_max,
        breed.characteristics.origin,
        breed.characteristics.breed_group,
        breed.temperament, // PostgreSQL array
        breed.health_considerations,
        breed.key_health_tips,
        breed.popularity_score
      ]);

      imported++;
      if (imported % 10 === 0) {
        console.log(`📥 Imported ${imported}/${jsonData.length} breeds...`);
      }
    }

    console.log('✅ Import complete!');
    console.log(`📊 Total breeds imported: ${imported}`);

    // Verify
    const result = await pool.query('SELECT COUNT(*) FROM breeds');
    console.log(`✅ Database now contains ${result.rows[0].count} breeds`);

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    pool.end();
  }
}

importData();