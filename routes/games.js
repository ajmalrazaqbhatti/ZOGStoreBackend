const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to protect all game routes
router.use(isAuthenticated);

// Endpoint to fetch all games
router.get('/', (req, res) => {
  db.query('SELECT * FROM games', (err, results) => {
    if (err) {
      res.status(500).send('Error fetching data');
    } else {
      res.json(results);
    }
  });
});

module.exports = router;
