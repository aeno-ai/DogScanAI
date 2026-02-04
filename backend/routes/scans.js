const express = require('express');

const router = express.Router();

// imports
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');

// ============================================
// GET USER'S SCANS (Protected)
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;

    const query = `
      SELECT id, dog_breed, image_url, confidence, scanned_at
      FROM dog_scans
      WHERE user_id = $1
      ORDER BY scanned_at DESC
    `;
    
    const result = await client.query(query, [userId]);

    res.json({ scans: result.rows });

  } catch (error) {
    console.error('Get scans error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ============================================
// CREATE NEW SCAN (Protected)
// ============================================
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { dogBreed, imageUrl, confidence } = req.body;

    const query = `
      INSERT INTO dog_scans (user_id, dog_breed, image_url, confidence)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      userId,
      dogBreed,
      imageUrl,
      confidence
    ]);

    res.status(201).json({ scan: result.rows[0] });

  } catch (error) {
    console.error('Create scan error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;