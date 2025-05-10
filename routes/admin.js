/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');

// Apply authentication and admin checks to all routes
router.use(isAuthenticated);
router.use(isAdmin);

/********************************************************
 * MANAGE GAMES (ADMIN ONLY)
 ********************************************************/
// Add a new game
router.post('/games/insert', (req, res) => {
  const { title, description, price, platform, genre, gameicon } = req.body;
  
  // Make sure we have the required fields
  if (!title || !price || !genre) {
    return res.status(400).json({ message: 'Required fields missing' });
  }
  
  // Insert the new game with current timestamp
  const query = `
    INSERT INTO games 
    (title, description, price, platform, genre, gameicon, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;
  
  db.query(
    query, 
    [title, description, price, platform, genre, gameicon],
    (err, result) => {
      if (err) {
        console.error('Error adding game:', err);
        return res.status(500).json({ message: 'Error adding game' });
      }
      
      // Get stock quantity or use default of 0
      const stockQuantity = req.body.stock_quantity !== undefined ? req.body.stock_quantity : 0;
      
      // Create inventory record for the new game
      db.query(
        'INSERT INTO inventory (game_id, stock_quantity) VALUES (?, ?)',
        [result.insertId, stockQuantity],
        (err) => {
          if (err) {
            console.error('Error adding inventory:', err);
          }
          
          return res.status(201).json({
            message: 'Game added successfully',
            gameId: result.insertId,
            stockQuantity: stockQuantity
          });
        }
      );
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
  
  // Build dynamic update query based on provided fields
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
  
  // Make sure we have something to update
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }
  
  const query = `UPDATE games SET ${updateFields.join(', ')} WHERE game_id = ?`;
  queryParams.push(gameId);
  
  // Update the game in the database
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
    
    // First check if game exists in any cart
    db.query('SELECT COUNT(*) as cart_count FROM cart WHERE game_id = ?', 
      [gameId], 
      (err, cartResults) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error checking cart usage:', err);
            res.status(500).json({ message: 'Error deleting game' });
          });
        }
        
        const cartCount = cartResults[0].cart_count;
        
        // Don't delete if the game is in someone's cart
        if (cartCount > 0) {
          return db.rollback(() => {
            res.status(400).json({ 
              message: 'Cannot delete game that is in active carts',
              inCart: true,
              inOrders: false
            });
          });
        }
        
        // Check if game exists in active orders
        const activeOrderQuery = `
          SELECT COUNT(*) as active_order_count 
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.order_id
          WHERE oi.game_id = ? 
          AND o.status NOT IN ('shipped', 'delivered', 'canceled')
        `;
        
        db.query(activeOrderQuery, [gameId], (err, orderResults) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error checking order usage:', err);
              res.status(500).json({ message: 'Error deleting game' });
            });
          }
          
          const activeOrderCount = orderResults[0].active_order_count;
          
          // Don't delete if the game is in active orders
          if (activeOrderCount > 0) {
            return db.rollback(() => {
              res.status(400).json({ 
                message: 'Cannot delete game that is in active orders',
                inCart: false,
                inOrders: true
              });
            });
          }
          
          // Delete from cart just in case (safety check)
          db.query('DELETE FROM cart WHERE game_id = ?', [gameId], (err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting from cart:', err);
                res.status(500).json({ message: 'Error deleting game' });
              });
            }
            
            // First update inventory to set stock to 0
            db.query('UPDATE inventory SET stock_quantity = 0 WHERE game_id = ?', [gameId], (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error updating inventory:', err);
                  res.status(500).json({ message: 'Error deleting game' });
                });
              }
              
              // Do a soft delete by setting is_deleted flag to TRUE
              db.query('UPDATE games SET is_deleted = TRUE WHERE game_id = ?', [gameId], (err, result) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error soft deleting game:', err);
                    res.status(500).json({ message: 'Error deleting game' });
                  });
                }
                
                if (result.affectedRows === 0) {
                  return db.rollback(() => {
                    res.status(404).json({ message: 'Game not found' });
                  });
                }
                
                // Commit all changes if everything went well
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
      }
    );
  });
});

/********************************************************
 * SEARCH ORDERS
 ********************************************************/
router.get('/orders/search', (req, res) => {
  // For admin, we want to search all orders, not just for a specific user
  const { 
    orderId,
    customerName
  } = req.query;

  // Start building the query
  let query = `
    SELECT DISTINCT o.order_id, o.user_id, o.total_amount, o.order_date, o.status as order_status,
           p.payment_method, u.username, u.email
    FROM orders o
    LEFT JOIN payments p ON o.order_id = p.order_id
    LEFT JOIN users u ON o.user_id = u.user_id
    WHERE 1=1
  `;

  const queryParams = [];

  // Add search filters if provided
  if (orderId) {
    query += ` AND o.order_id = ?`;
    queryParams.push(orderId);
  }

  if (customerName) {
    query += ` AND u.username LIKE ?`;
    queryParams.push(`%${customerName}%`);
  }

  // Sort by order ID, newest first
  query += ` ORDER BY o.order_id DESC`;

  // Execute the search query
  db.query(query, queryParams, (err, orders) => {
    if (err) {
      console.error('Error searching orders:', err);
      return res.status(500).json({ message: 'Error searching orders' });
    }

    // If no orders found, return empty array
    if (orders.length === 0) {
      return res.status(200).json({ orders: [] });
    }

    // Get all order items for the found orders
    const orderIds = orders.map(order => order.order_id);
    const itemsQuery = `
      SELECT oi.order_id, oi.order_item_id, oi.game_id, oi.quantity,
             IFNULL(g.title, 'Product No Longer Available') as title, 
             IFNULL(g.price, 0) as price, 
             IFNULL(g.gameicon, '') as gameicon, 
             (IFNULL(g.price, 0) * oi.quantity) AS subtotal
      FROM order_items oi
      LEFT JOIN games g ON oi.game_id = g.game_id
      WHERE oi.order_id IN (?)
      ORDER BY oi.order_item_id DESC
    `;

    db.query(itemsQuery, [orderIds], (err, allItems) => {
      if (err) {
        console.error('Error fetching order items:', err);
        return res.status(500).json({ message: 'Error fetching order items' });
      }

      // Group items by order ID
      const itemsByOrder = {};
      allItems.forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push({
          ...item,
          title: item.title || 'Unknown',
          price: item.price || 0,
          gameicon: item.gameicon || 'default-icon.png',
          subtotal: item.subtotal || 0
        });
      });

      // Add items to each order
      const ordersWithItems = orders.map(order => ({
        ...order,
        items: itemsByOrder[order.order_id] || []
      }));

      // Return the search results
      res.status(200).json({ 
        orders: ordersWithItems,
        count: ordersWithItems.length
      });
    });
  });
});

/********************************************************
 * INVENTORY MANAGEMENT (ADMIN ONLY)
 ********************************************************/
// Get all inventory with game images
router.get('/inventory', (req, res) => {
  // Query to get inventory data with game details
  const query = `
    SELECT i.inventory_id, i.game_id, i.stock_quantity, g.title, g.gameicon
    FROM inventory i
    JOIN games g ON i.game_id = g.game_id
    ORDER BY i.inventory_id DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching inventory:', err);
      return res.status(500).json({ message: 'Error fetching inventory' });
    }
    
    return res.status(200).json(results);
  });
});

// Update inventory quantity for a game
router.put('/inventory/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { stockQuantity } = req.body;
  
  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }
  
  // Make sure stock quantity is valid
  if (stockQuantity === undefined || stockQuantity < 0) {
    return res.status(400).json({ message: 'Valid stock quantity is required' });
  }
  
  // First check if inventory exists for this game
  db.query('SELECT * FROM inventory WHERE game_id = ?', [gameId], (err, results) => {
    if (err) {
      console.error('Error checking inventory:', err);
      return res.status(500).json({ message: 'Error updating inventory' });
    }
    
    // If inventory exists, update the quantity
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
      // If inventory doesn't exist, create a new record
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
  // Get all orders with user details
  const query = `
    SELECT o.order_id, o.user_id, o.order_date, o.status, o.total_amount, 
           u.username, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.order_id DESC
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
    
    // Get items for all orders in a single query (more efficient)
    const itemsQuery = `
      SELECT oi.order_id, oi.order_item_id, oi.game_id, oi.quantity, g.price,
             g.title, g.gameicon 
      FROM order_items oi
      JOIN games g ON oi.game_id = g.game_id
      WHERE oi.order_id IN (?)
      ORDER BY oi.order_item_id DESC
    `;
    
    db.query(itemsQuery, [orderIds], (err, itemResults) => {
      if (err) {
        console.error('Error fetching order items:', err);
        return res.status(500).json({ message: 'Error fetching order items' });
      }
      
      // Organize items by order_id for efficient lookup
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
  
  // Make sure the status value is valid
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'canceled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'Invalid status value',
      validValues: validStatuses
    });
  }
  
  // Update the order status
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
  
  // Start a transaction to ensure data integrity
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
      
      // Delete related payment records first
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
            
            // Commit the transaction if everything succeeded
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
// Search users by username or email
router.get('/users/search', (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ message: 'Search query is required' });
  }
  
  // Search users by username or email using LIKE for partial matching
  const searchQuery = `
    SELECT user_id, username, email, created_at, role
    FROM users
    WHERE username LIKE ? OR email LIKE ?
    ORDER BY user_id DESC
  `;
  
  const searchParam = `%${query}%`;
  
  db.query(searchQuery, [searchParam, searchParam], (err, results) => {
    if (err) {
      console.error('Error searching users:', err);
      return res.status(500).json({ message: 'Error searching users' });
    }
    
    return res.status(200).json(results);
  });
});

// Get all users
router.get('/users', (req, res) => {
  // Get all users (excluding password field)
  const query = `
    SELECT user_id, username, email, created_at, role
    FROM users
    ORDER BY user_id DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Error fetching users' });
    }
    
    return res.status(200).json(results);
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
    // Make sure role is valid
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
  
  // Make sure we have something to update
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }
  
  const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
  queryParams.push(userId);
  
  // Update the user in the database
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
  
  // Validate password strength
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Valid password is required (minimum 8 characters)' });
  }
  
  // Hash the new password for security
  const saltRounds = 10;
  
  bcrypt.hash(newPassword, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({ message: 'Error changing password' });
    }
    
    // Update the password in the database
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
  
  // Start a transaction to ensure data integrity
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ message: 'Error deleting user' });
    }
    
    // Check if user has orders - we can't delete users with order history
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
        
        // Delete user's cart items first
        db.query('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting cart items:', err);
              res.status(500).json({ message: 'Error deleting user' });
            });
          }
          
          // Finally delete the user
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
            
            // Commit the transaction if everything succeeded
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
