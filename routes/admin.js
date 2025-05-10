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
// Add a new game
router.post('/games/insert', (req, res) => {
  const { title, description, price, platform, genre, gameicon } = req.body;
  
  if (!title || !price || !genre) {
    return res.status(400).json({ message: 'Required fields missing' });
  }
  
  const query = `
    INSERT INTO games 
    (title, description, price, platform, genre, gameicon) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.query(
    query, 
    [title, description, price, platform, genre, gameicon],
    (err, result) => {
      if (err) {
        console.error('Error adding game:', err);
        return res.status(500).json({ message: 'Error adding game' });
      }
      
      // Add initial inventory if stock quantity is provided
      if (req.body.stock_quantity !== undefined) {
        db.query(
          'INSERT INTO inventory (game_id, stock_quantity) VALUES (?, ?)',
          [result.insertId, req.body.stock_quantity],
          (err) => {
            if (err) {
              console.error('Error adding inventory:', err);
              // Continue despite inventory error
            }
          }
        );
      }
      
      return res.status(201).json({
        message: 'Game added successfully',
        gameId: result.insertId
      });
    }
  );
});

// Update an existing game
router.put('/games/update/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { title, description, price, platform, genre, gameicon } = req.body;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  let updateFields = [];
  let queryParams = [];
  
  if (title) {
    updateFields.push('title = ?');
    queryParams.push(title);
  }
  
  if (description) {
    updateFields.push('description = ?');
    queryParams.push(description);
  }
  
  if (price) {
    updateFields.push('price = ?');
    queryParams.push(price);
  }
  
  if (platform) {
    updateFields.push('platform = ?');
    queryParams.push(platform);
  }
  
  if (genre) {
    updateFields.push('genre = ?');
    queryParams.push(genre);
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
    
    // Update inventory if stock quantity is provided
    if (req.body.stockQuantity !== undefined) {
      db.query(
        'INSERT INTO inventory (game_id, stock_quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE stock_quantity = ?',
        [gameId, req.body.stockQuantity, req.body.stockQuantity],
        (err) => {
          if (err) {
            console.error('Error updating inventory:', err);
            // Continue despite inventory error
          }
        }
      );
    }
    
    return res.status(200).json({
      message: 'Game updated successfully',
      gameId: gameId
    });
  });
});

// Delete a game
router.delete('/games/delete/:gameId', (req, res) => {
  const { gameId } = req.params;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  // Start a transaction to ensure atomicity
  db.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ message: 'Error deleting game' });
    }
    
    // Check if game exists in cart or orders
    const checkQuery = `
      SELECT 
        (SELECT COUNT(*) FROM cart WHERE game_id = ?) as cart_count,
        (SELECT COUNT(*) FROM order_items WHERE game_id = ?) as order_count
    `;
    
    db.query(checkQuery, [gameId, gameId], (err, results) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error checking game usage:', err);
          res.status(500).json({ message: 'Error deleting game' });
        });
      }
      const { cart_count, order_count } = results[0];
      if (cart_count > 0 || order_count > 0) {
        return db.rollback(() => {
          res.status(400).json({ 
            message: 'Cannot delete game that is in active carts or orders',
            inCart: cart_count > 0,
            inOrders: order_count > 0
          });
        });
      }
      
      // First, delete from order_items if they exist (this is a safety check even though we already checked)
      db.query('DELETE FROM order_items WHERE game_id = ?', [gameId], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error deleting from order_items:', err);
            res.status(500).json({ message: 'Error deleting game' });
          });
        }
        
        // Delete from cart if they exist (this is a safety check even though we already checked)
        db.query('DELETE FROM cart WHERE game_id = ?', [gameId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting from cart:', err);
              res.status(500).json({ message: 'Error deleting game' });
            });
          }
          
          // Delete from inventory
          db.query('DELETE FROM inventory WHERE game_id = ?', [gameId], (err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting from inventory:', err);
                res.status(500).json({ message: 'Error deleting game' });
              });
            }
            
            // Now delete the game
            db.query('DELETE FROM games WHERE game_id = ?', [gameId], (err, result) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error deleting game:', err);
                  res.status(500).json({ message: 'Error deleting game' });
                });
              }
              
              if (result.affectedRows === 0) {
                return db.rollback(() => {
                  res.status(404).json({ message: 'Game not found' });
                });
              }
              
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ message: 'Error deleting game' });
                  });
                }
                
                return res.status(200).json({
                  message: 'Game deleted successfully',
                  gameId: gameId
                });
              });
            });
          });
        });
      });
    });
  });
});

/********************************************************
 * INVENTORY MANAGEMENT (ADMIN ONLY)
 ********************************************************/
// Get all inventory with game images
router.get('/inventory', (req, res) => {
  const query = `
    SELECT i.inventory_id, i.game_id, i.stock_quantity, g.title, g.gameicon
    FROM inventory i
    JOIN games g ON i.game_id = g.game_id
    ORDER BY g.title
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching inventory:', err);
      return res.status(500).json({ message: 'Error fetching inventory' });
    }
    
    return res.status(200).json(results);
  });
});

// Get inventory for a specific game with image
router.get('/inventory/:gameId', (req, res) => {
  const { gameId } = req.params;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  const query = `
    SELECT i.inventory_id, i.game_id, i.stock_quantity, g.title, g.gameicon
    FROM inventory i
    JOIN games g ON i.game_id = g.game_id
    WHERE i.game_id = ?
  `;
  
  db.query(query, [gameId], (err, results) => {
    if (err) {
      console.error('Error fetching game inventory:', err);
      return res.status(500).json({ message: 'Error fetching game inventory' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Inventory not found for this game' });
    }
    
    return res.status(200).json(results[0]);
  });
});

// Update inventory quantity for a game
router.put('/inventory/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { stockQuantity } = req.body;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  if (stockQuantity === undefined || stockQuantity < 0) {
    return res.status(400).json({ message: 'Valid stock quantity is required' });
  }
  
  // First check if inventory exists for this game
  db.query('SELECT * FROM inventory WHERE game_id = ?', [gameId], (err, results) => {
    if (err) {
      console.error('Error checking inventory:', err);
      return res.status(500).json({ message: 'Error updating inventory' });
    }
    
    // If inventory exists, update quantity
    if (results.length > 0) {
      db.query(
        'UPDATE inventory SET stock_quantity = ? WHERE game_id = ?',
        [stockQuantity, gameId],
        (err, result) => {
          if (err) {
            console.error('Error updating inventory:', err);
            return res.status(500).json({ message: 'Error updating inventory' });
          }
          
          return res.status(200).json({
            message: 'Inventory quantity updated successfully',
            gameId: gameId,
            stockQuantity: stockQuantity
          });
        }
      );
    } else {
      // If inventory doesn't exist, create new record
      db.query(
        'INSERT INTO inventory (game_id, stock_quantity) VALUES (?, ?)',
        [gameId, stockQuantity],
        (err, result) => {
          if (err) {
            console.error('Error creating inventory record:', err);
            return res.status(500).json({ message: 'Error updating inventory' });
          }
          
          return res.status(201).json({
            message: 'Inventory record created successfully',
            gameId: gameId,
            stockQuantity: stockQuantity
          });
        }
      );
    }
  });
});

/********************************************************
 * ORDER MANAGEMENT (ADMIN ONLY)
 ********************************************************/
// Get all orders with details including items
router.get('/orders', (req, res) => {
  const query = `
    SELECT o.order_id, o.user_id, o.order_date, o.status, o.total_amount, 
           u.username, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.order_date DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ message: 'Error fetching orders' });
    }
    
    if (results.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get all order IDs to fetch their items
    const orderIds = results.map(order => order.order_id);
    
    // Get items for all orders in a single query
    const itemsQuery = `
      SELECT oi.order_id, oi.order_item_id, oi.game_id, oi.quantity, g.price,
             g.title, g.gameicon 
      FROM order_items oi
      JOIN games g ON oi.game_id = g.game_id
      WHERE oi.order_id IN (?)
    `;
    
    db.query(itemsQuery, [orderIds], (err, itemResults) => {
      if (err) {
        console.error('Error fetching order items:', err);
        return res.status(500).json({ message: 'Error fetching order items' });
      }
      
      // Organize items by order_id
      const itemsByOrder = {};
      itemResults.forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      });
      
      // Add items to each order
      const ordersWithItems = results.map(order => ({
        ...order,
        items: itemsByOrder[order.order_id] || []
      }));
      
      return res.status(200).json(ordersWithItems);
    });
  });
});

// Update order status
router.put('/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is required' });
  }
  
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }
  
  // Validate status value
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'canceled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'Invalid status value',
      validValues: validStatuses
    });
  }
  
  const query = 'UPDATE orders SET status = ? WHERE order_id = ?';
  
  db.query(query, [status, orderId], (err, result) => {
    if (err) {
      console.error('Error updating order status:', err);
      return res.status(500).json({ message: 'Error updating order status' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    return res.status(200).json({
      message: 'Order status updated successfully',
      orderId: orderId,
      status: status
    });
  });
});

// Delete order (with transaction to maintain data integrity)
router.delete('/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is required' });
  }
  
  // Start a transaction
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ message: 'Error deleting order' });
    }
    
    // First, check if order exists
    db.query('SELECT * FROM orders WHERE order_id = ?', [orderId], (err, results) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error checking order:', err);
          res.status(500).json({ message: 'Error deleting order' });
        });
      }
      
      if (results.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ message: 'Order not found' });
        });
      }
      
      // First, delete payment records
      db.query('DELETE FROM payments WHERE order_id = ?', [orderId], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error deleting payment records:', err);
            res.status(500).json({ message: 'Error deleting order' });
          });
        }

        // Then delete order items
        db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting order items:', err);
              res.status(500).json({ message: 'Error deleting order' });
            });
          }
          
          // Finally delete the order itself
          db.query('DELETE FROM orders WHERE order_id = ?', [orderId], (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting order:', err);
                res.status(500).json({ message: 'Error deleting order' });
              });
            }
            
            // Commit transaction
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error committing transaction:', err);
                  res.status(500).json({ message: 'Error deleting order' });
                });
              }
              
              return res.status(200).json({
                message: 'Order deleted successfully',
                orderId: orderId
              });
            });
          });
        });
      });
    });
  });
});

/********************************************************
 * USER MANAGEMENT (ADMIN ONLY)
 ********************************************************/
// Get all users
router.get('/users', (req, res) => {
  const query = `
    SELECT user_id, username, email, created_at, role
    FROM users
    ORDER BY username
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Error fetching users' });
    }
    
    return res.status(200).json(results);
  });
});

// Get specific user
router.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  const query = `
    SELECT user_id, username, email, created_at, role
    FROM users
    WHERE user_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Error fetching user' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json(results[0]);
  });
});

// Update user information
router.put('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { username, email, role } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  // Build update query dynamically based on provided fields
  let updateFields = [];
  let queryParams = [];
  
  if (username) {
    updateFields.push('username = ?');
    queryParams.push(username);
  }
  
  if (email) {
    updateFields.push('email = ?');
    queryParams.push(email);
  }
  
  if (role) {
    // Validate role value
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role value',
        validValues: validRoles
      });
    }
    updateFields.push('role = ?');
    queryParams.push(role);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }
  
  const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
  queryParams.push(userId);
  
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      return res.status(500).json({ message: 'Error updating user' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({
      message: 'User updated successfully',
      userId: userId
    });
  });
});

// Change user password
router.put('/users/:userId/password', (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Valid password is required (minimum 6 characters)' });
  }
  
  // Hash the new password (you should import bcrypt at the top of the file)
  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  
  bcrypt.hash(newPassword, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({ message: 'Error changing password' });
    }
    
    const query = 'UPDATE users SET password = ? WHERE user_id = ?';
    
    db.query(query, [hash, userId], (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ message: 'Error changing password' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      return res.status(200).json({
        message: 'Password changed successfully',
        userId: userId
      });
    });
  });
});

// Delete user
router.delete('/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  // Don't allow deleting the current admin user
  if (userId == req.session.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }
  
  // Start a transaction to ensure atomicity
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ message: 'Error deleting user' });
    }
    
    // Check if user has orders
    db.query('SELECT COUNT(*) as order_count FROM orders WHERE user_id = ?', 
      [userId], 
      (err, orderResults) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error checking user orders:', err);
            res.status(500).json({ message: 'Error deleting user' });
          });
        }
        
        if (orderResults[0].order_count > 0) {
          return db.rollback(() => {
            res.status(400).json({ 
              message: 'Cannot delete user with existing orders',
              orderCount: orderResults[0].order_count
            });
          });
        }
        
        // Delete user's cart items
        db.query('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting cart items:', err);
              res.status(500).json({ message: 'Error deleting user' });
            });
          }
          
          // Delete the user
          db.query('DELETE FROM users WHERE user_id = ?', [userId], (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting user:', err);
                res.status(500).json({ message: 'Error deleting user' });
              });
            }
            
            if (result.affectedRows === 0) {
              return db.rollback(() => {
                res.status(404).json({ message: 'User not found' });
              });
            }
            
            // Commit the transaction
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error committing transaction:', err);
                  res.status(500).json({ message: 'Error deleting user' });
                });
              }
              
              return res.status(200).json({
                message: 'User deleted successfully',
                userId: userId
              });
            });
          });
        });
      }
    );
  });
});

module.exports = router;
