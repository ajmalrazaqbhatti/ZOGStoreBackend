/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Apply authentication and admin checks to all routes
router.use(isAuthenticated);
router.use(isAdmin);

/********************************************************
 * MANAGE GAMES (ADMIN ONLY)
 ********************************************************/
router.post('/games', (req, res) => {
  const { title, price, description, genre, releaseDate, developer, publisher, gameicon } = req.body;
  
  if (!title || !price || !genre) {
    return res.status(400).json({ message: 'Required fields missing' });
  }
  
  const query = `
    INSERT INTO games 
    (title, price, description, genre, release_date, developer, publisher, gameicon) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(
    query, 
    [title, price, description, genre, releaseDate, developer, publisher, gameicon],
    (err, result) => {
      if (err) {
        console.error('Error adding game:', err);
        return res.status(500).json({ message: 'Error adding game' });
      }
      
      return res.status(201).json({
        message: 'Game added successfully',
        gameId: result.insertId
      });
    }
  );
});

router.put('/games/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { title, price, description, genre, releaseDate, developer, publisher, gameicon } = req.body;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  let updateFields = [];
  let queryParams = [];
  
  if (title) {
    updateFields.push('title = ?');
    queryParams.push(title);
  }
  
  if (price) {
    updateFields.push('price = ?');
    queryParams.push(price);
  }
  
  if (description) {
    updateFields.push('description = ?');
    queryParams.push(description);
  }
  
  if (genre) {
    updateFields.push('genre = ?');
    queryParams.push(genre);
  }
  
  if (releaseDate) {
    updateFields.push('release_date = ?');
    queryParams.push(releaseDate);
  }
  
  if (developer) {
    updateFields.push('developer = ?');
    queryParams.push(developer);
  }
  
  if (publisher) {
    updateFields.push('publisher = ?');
    queryParams.push(publisher);
  }
  
  if (gameicon) {
    updateFields.push('gameicon = ?');
    queryParams.push(gameicon);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }
  
  const query = `UPDATE games SET ${updateFields.join(', ')} WHERE game_id = ?`;
  queryParams.push(gameId);
  
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error updating game:', err);
      return res.status(500).json({ message: 'Error updating game' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    return res.status(200).json({
      message: 'Game updated successfully',
      gameId: gameId
    });
  });
});

router.delete('/games/:gameId', (req, res) => {
  const { gameId } = req.params;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  db.query('DELETE FROM games WHERE game_id = ?', [gameId], (err, result) => {
    if (err) {
      console.error('Error deleting game:', err);
      return res.status(500).json({ message: 'Error deleting game' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    return res.status(200).json({
      message: 'Game deleted successfully',
      gameId: gameId
    });
  });
});

/********************************************************
 * MANAGE INVENTORY (ADMIN ONLY)
 ********************************************************/
router.post('/inventory', (req, res) => {
  const { gameId, stockQuantity } = req.body;
  
  if (!gameId || stockQuantity === undefined) {
    return res.status(400).json({ message: 'Game ID and stock quantity are required' });
  }
  
  const query = `
    INSERT INTO inventory (game_id, stock_quantity) 
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE stock_quantity = ?
  `;
  
  db.query(query, [gameId, stockQuantity, stockQuantity], (err, result) => {
    if (err) {
      console.error('Error updating inventory:', err);
      return res.status(500).json({ message: 'Error updating inventory' });
    }
    
    return res.status(200).json({
      message: 'Inventory updated successfully',
      gameId: gameId,
      stockQuantity: stockQuantity
    });
  });
});

/********************************************************
 * MANAGE USERS (ADMIN ONLY)
 ********************************************************/
router.get('/users', (req, res) => {
  db.query(
    'SELECT user_id, username, email, role, created_at FROM users',
    (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ message: 'Error fetching users' });
      }
      
      res.json(results);
    }
  );
});

router.put('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  if (!userId || !role) {
    return res.status(400).json({ message: 'User ID and role are required' });
  }
  
  db.query(
    'UPDATE users SET role = ? WHERE user_id = ?',
    [role, userId],
    (err, result) => {
      if (err) {
        console.error('Error updating user role:', err);
        return res.status(500).json({ message: 'Error updating user role' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      return res.status(200).json({
        message: 'User role updated successfully',
        userId: userId,
        role: role
      });
    }
  );
});

module.exports = router;
