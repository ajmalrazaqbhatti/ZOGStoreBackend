/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated, isRegularUser } = require('../middleware/auth');

// Make sure user is logged in for order operations
router.use(isAuthenticated);

/********************************************************
 * CREATE ORDER
 ********************************************************/
router.post('/create', isRegularUser, (req, res) => {
  const userId = req.session.user.id;
  const { paymentMethod } = req.body;
  
  // Start a database transaction to ensure all operations succeed or fail together
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    // Get all items from the user's cart with game info and stock levels
    const cartQuery = `
      SELECT c.cart_id, c.game_id, c.quantity, 
             g.price, i.stock_quantity
      FROM cart c
      JOIN games g ON c.game_id = g.game_id
      JOIN inventory i ON g.game_id = i.game_id
      WHERE c.user_id = ?
    `;
    
    db.query(cartQuery, [userId], (err, cartItems) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error fetching cart:', err);
          res.status(500).json({ message: 'Error creating order' });
        });
      }
      
      // Can't create an order with an empty cart
      if (cartItems.length === 0) {
        return db.rollback(() => {
          res.status(400).json({ message: 'Cart is empty' });
        });
      }
      
      // Check if any items are out of stock
      let isOutOfStock = false;
      let outOfStockItem = null;
      
      for (const item of cartItems) {
        if (item.quantity > item.stock_quantity) {
          isOutOfStock = true;
          outOfStockItem = item.game_id;
          break;
        }
      }
      
      if (isOutOfStock) {
        return db.rollback(() => {
          res.status(400).json({ 
            message: 'Item is out of stock or quantity exceeds available stock',
            gameId: outOfStockItem
          });
        });
      }
      
      // Calculate the total order amount
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create the order
      db.query('INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
        [userId, totalAmount],
        (err, orderResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error creating order:', err);
              res.status(500).json({ message: 'Error creating order' });
            });
          }
          
          const orderId = orderResult.insertId;
          
          // Prepare order items data
          const orderItems = cartItems.map(item => [
            orderId,
            item.game_id,
            item.quantity
          ]);
          
          // Insert all order items
          db.query('INSERT INTO order_items (order_id, game_id, quantity) VALUES ?',
            [orderItems],
            (err, itemsResult) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error creating order items:', err);
                  res.status(500).json({ message: 'Error creating order' });
                });
              }
              
              // Create the payment record
              db.query(
                'INSERT INTO payments (order_id, payment_method) VALUES (?, ?)',
                [orderId, paymentMethod || 'Credit Card'],
                (err, paymentResult) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error('Error creating payment record:', err);
                      res.status(500).json({ message: 'Error processing payment' });
                    });
                  }
                  
                  // Clear the cart after successful order creation
                  db.query('DELETE FROM cart WHERE user_id = ?', [userId], (err, clearResult) => {
                    if (err) {
                      return db.rollback(() => {
                        console.error('Error clearing cart:', err);
                        res.status(500).json({ message: 'Error creating order' });
                      });
                    }
                    
                    // Everything went well, commit the transaction!
                    db.commit(err => {
                      if (err) {
                        return db.rollback(() => {
                          console.error('Error committing transaction:', err);
                          res.status(500).json({ message: 'Error creating order' });
                        });
                      }
                      
                      // Return the order details
                      res.status(201).json({
                        message: 'Order created successfully',
                        orderId: orderId,
                        totalAmount: totalAmount,
                        itemCount: cartItems.length,
                        paymentId: paymentResult.insertId,
                        paymentStatus: 'Pending'
                      });
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

/********************************************************
 * GET USER ORDERS
 ********************************************************/
router.get('/', isRegularUser, (req, res) => {
  const userId = req.session.user.id;
  const statusFilter = req.query.status;
  
  // Get orders with payment info
  let query = `
    SELECT o.order_id, o.total_amount, o.order_date, o.status as order_status,
           p.payment_method
    FROM orders o
    LEFT JOIN payments p ON o.order_id = p.order_id
    WHERE o.user_id = ?
  `;
  
  const queryParams = [userId];
  
  // Add status filter if provided
  if (statusFilter && statusFilter !== 'All') {
    query += ` AND o.status = ?`;
    queryParams.push(statusFilter);
  }
  
  // Sort by ID, newest first
  query += ` ORDER BY o.order_id DESC`;
  
  // Get counts by status for displaying tabs/filters
  const countQuery = `
    SELECT o.status as status, COUNT(*) as count
    FROM orders o
    WHERE o.user_id = ?
    GROUP BY o.status
    ORDER BY o.status DESC
  `;
  
  db.query(countQuery, [userId], (err, statusResults) => {
    if (err) {
      console.error('Error counting order statuses:', err);
      return res.status(500).json({ message: 'Error fetching orders' });
    }
    
    // Format the status counts
    const statusCounts = {};
    let totalCount = 0;
    
    statusResults.forEach(row => {
      statusCounts[row.status || 'Unknown'] = row.count;
      totalCount += row.count;
    });
    
    // Get the actual orders
    db.query(query, queryParams, (err, orders) => {
      if (err) {
        console.error('Error fetching orders:', err);
        return res.status(500).json({ message: 'Error fetching orders' });
      }
      
      // If no orders found, return empty list with status counts
      if (orders.length === 0) {
        return res.status(200).json({ 
          orders: [],
          statusCounts
        });
      }
      
      // Get all order items in a single query for better performance
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
        
        // Return orders with items and status counts
        res.status(200).json({ 
          orders: ordersWithItems,
          statusCounts
        });
      });
    });
  });
});



module.exports = router;
