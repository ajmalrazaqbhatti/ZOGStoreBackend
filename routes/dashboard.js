/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Apply authentication check to all routes
router.use(isAuthenticated);
// Apply admin check to all dashboard routes
router.use(isAdmin);

/********************************************************
 * GET DASHBOARD STATISTICS
 ********************************************************/
router.get('/stats', (req, res) => {
  const stats = {};
  let completedQueries = 0;
  const totalQueries = 6;
  
  // Get total users
  db.query('SELECT COUNT(*) as totalUsers FROM users', (err, results) => {
    if (err) {
      console.error('Error fetching user count:', err);
      return res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
    
    stats.totalUsers = results[0].totalUsers;
    checkComplete();
  });
  
  // Get total games
  db.query('SELECT COUNT(*) as totalGames FROM games', (err, results) => {
    if (err) {
      console.error('Error fetching game count:', err);
      return res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
    
    stats.totalGames = results[0].totalGames;
    checkComplete();
  });
  
  // Get total orders
  db.query('SELECT COUNT(*) as totalOrders FROM orders', (err, results) => {
    if (err) {
      console.error('Error fetching order count:', err);
      return res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
    
    stats.totalOrders = results[0].totalOrders;
    checkComplete();
  });
  
  // Get total sales
  db.query('SELECT SUM(total_amount) as totalSales FROM orders', (err, results) => {
    if (err) {
      console.error('Error fetching sales data:', err);
      return res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
    
    stats.totalSales = results[0].totalSales || 0;
    checkComplete();
  });
  
  // Get recent orders
  db.query(
    'SELECT o.order_id, o.total_amount, o.order_date, u.username FROM orders o JOIN users u ON o.user_id = u.user_id ORDER BY o.order_date DESC LIMIT 5', 
    (err, results) => {
      if (err) {
        console.error('Error fetching recent orders:', err);
        return res.status(500).json({ message: 'Error fetching dashboard statistics' });
      }
      
      stats.recentOrders = results;
      checkComplete();
    }
  );
  
  // Get sales by payment method
  db.query(
    'SELECT payment_method, COUNT(*) as count, SUM(o.total_amount) as total FROM payments p JOIN orders o ON p.order_id = o.order_id GROUP BY payment_method', 
    (err, results) => {
      if (err) {
        console.error('Error fetching payment method stats:', err);
        return res.status(500).json({ message: 'Error fetching dashboard statistics' });
      }
      
      stats.paymentMethodStats = results;
      checkComplete();
    }
  );
  
  function checkComplete() {
    completedQueries++;
    if (completedQueries === totalQueries) {
      res.json(stats);
    }
  }
});

/********************************************************
 * GET SALES OVER TIME
 ********************************************************/
router.get('/sales-chart', (req, res) => {
  const { period = 'monthly' } = req.query;
  
  let timeFormat;
  let groupBy;
  
  switch(period) {
    case 'daily':
      timeFormat = '%Y-%m-%d';
      groupBy = 'DATE(order_date)';
      break;
    case 'weekly':
      timeFormat = '%Y-%u';
      groupBy = 'YEAR(order_date), WEEK(order_date)';
      break;
    case 'monthly':
    default:
      timeFormat = '%Y-%m';
      groupBy = 'YEAR(order_date), MONTH(order_date)';
      break;
  }
  
  const query = `
    SELECT 
      DATE_FORMAT(order_date, '${timeFormat}') as time_period,
      SUM(total_amount) as sales,
      COUNT(*) as order_count
    FROM orders
    GROUP BY ${groupBy}
    ORDER BY MIN(order_date) ASC
    LIMIT 12
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching sales chart data:', err);
      return res.status(500).json({ message: 'Error fetching sales chart data' });
    }
    
    res.json(results);
  });
});

/********************************************************
 * GET TOP SELLING GAMES
 ********************************************************/
router.get('/top-games', (req, res) => {
  const { limit = 5 } = req.query;
  
  const query = `
    SELECT 
      g.game_id, g.title,
      SUM(oi.quantity) as units_sold,
      SUM(oi.quantity * g.price) as revenue
    FROM order_items oi
    JOIN games g ON oi.game_id = g.game_id
    JOIN orders o ON oi.order_id = o.order_id
    GROUP BY g.game_id, g.title
    ORDER BY units_sold DESC
    LIMIT ?
  `;
  
  db.query(query, [parseInt(limit)], (err, results) => {
    if (err) {
      console.error('Error fetching top games:', err);
      return res.status(500).json({ message: 'Error fetching top games data' });
    }
    
    res.json(results);
  });
});

module.exports = router;
