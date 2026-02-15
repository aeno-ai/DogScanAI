
const express = require('express');
const router = express.Router();
require('dotenv').config();
const pool = require('../config/database');


// GET /api/breeds - Get all breeds
router.get('/breeds', async (req, res) => {
  try {
    console.log('📥 Frontend requested all breeds');
    
    const result = await pool.query(`
      SELECT 
        breed_id,
        class_index,
        class_name,
        display_name,
        image_url,
        size,
        description,
        snout,
        ears,
        coat,
        tail,
        height_min,
        height_max,
        weight_min,
        weight_max,
        lifespan_min,
        lifespan_max,
        origin,
        breed_group,
        temperament,
        health_considerations,
        key_health_tips,
        popularity_score
      FROM breeds
      ORDER BY breed_id
    `);

    // Transform to match React component format
    const breeds = result.rows.map(row => ({
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
        tail: row.tail
      },
      measurements: {
        height_min: row.height_min,
        height_max: row.height_max,
        weight_min: row.weight_min,
        weight_max: row.weight_max
      },
      characteristics: {
        lifespan_min: row.lifespan_min,
        lifespan_max: row.lifespan_max,
        origin: row.origin,
        breed_group: row.breed_group
      },
      temperament: row.temperament,
      health_considerations: row.health_considerations,
      key_health_tips: row.key_health_tips,
      popularity_score: row.popularity_score
    }));

    console.log(`✅ Sending ${breeds.length} breeds to React`);
    res.json(breeds);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/breeds/:id - Get single breed
router.get('/breeds/:id', async (req, res) => {
  try {
    const breedId = parseInt(req.params.id);
    
    const result = await pool.query(`
      SELECT * FROM breeds WHERE breed_id = $1
    `, [breedId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breed not found' });
    }

    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;