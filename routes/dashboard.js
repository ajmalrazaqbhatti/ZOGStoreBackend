/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
import express from "express";
const router = express.Router();
import db from "../db.js";
import { isAuthenticated, isAdmin } from "../middleware/auth.js";

router.use(isAuthenticated);
router.use(isAdmin);

/********************************************************
 * GET DASHBOARD STATISTICS
 ********************************************************/
router.get("/stats", (req, res) => {
  const stats = {};
  let completedQueries = 0;
  const totalQueries = 6;

  db.query("SELECT COUNT(*) as totalUsers FROM users", (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error fetching dashboard statistics" });
    }

    stats.totalUsers = results[0].totalUsers;
    checkComplete();
  });

  db.query("SELECT COUNT(*) as totalGames FROM games", (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error fetching dashboard statistics" });
    }

    stats.totalGames = results[0].totalGames;
    checkComplete();
  });

  db.query("SELECT COUNT(*) as totalOrders FROM orders", (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error fetching dashboard statistics" });
    }

    stats.totalOrders = results[0].totalOrders;
    checkComplete();
  });

  db.query(
    "SELECT SUM(total_amount) as totalSales FROM orders",
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error fetching dashboard statistics" });
      }

      stats.totalSales = results[0].totalSales || 0;
      checkComplete();
    }
  );

  db.query(
    "SELECT o.order_id, o.total_amount, o.order_date, u.username FROM orders o JOIN users u ON o.user_id = u.user_id ORDER BY o.order_id DESC LIMIT 5",
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error fetching dashboard statistics" });
      }

      stats.recentOrders = results;
      checkComplete();
    }
  );

  db.query(
    "SELECT payment_method, COUNT(*) as count, SUM(o.total_amount) as total FROM payments p JOIN orders o ON p.order_id = o.order_id GROUP BY payment_method ORDER BY payment_method DESC",
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error fetching dashboard statistics" });
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
 * GET TOP SELLING GAMES
 ********************************************************/
router.get("/top-games", (req, res) => {
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
    ORDER BY units_sold DESC, g.game_id DESC
    LIMIT ?
  `;

  db.query(query, [parseInt(limit)], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching top games data" });
    }

    res.json(results);
  });
});

export default router;
