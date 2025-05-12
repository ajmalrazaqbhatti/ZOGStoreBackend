/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require("express");
const router = express.Router();
const db = require("../db");
const { isAuthenticated, isRegularUser } = require("../middleware/auth");

router.use(isAuthenticated);

/********************************************************
 * CREATE ORDER
 ********************************************************/
router.post("/create", isRegularUser, (req, res) => {
  const userId = req.session.user.id;
  const { paymentMethod } = req.body;

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }

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
          res.status(500).json({ message: "Error creating order" });
        });
      }

      if (cartItems.length === 0) {
        return db.rollback(() => {
          res.status(400).json({ message: "Cart is empty" });
        });
      }

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
            message: "Item is out of stock or quantity exceeds available stock",
            gameId: outOfStockItem,
          });
        });
      }

      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      db.query(
        "INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
        [userId, totalAmount],
        (err, orderResult) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: "Error creating order" });
            });
          }

          const orderId = orderResult.insertId;

          const orderItems = cartItems.map((item) => [
            orderId,
            item.game_id,
            item.quantity,
          ]);

          db.query(
            "INSERT INTO order_items (order_id, game_id, quantity) VALUES ?",
            [orderItems],
            (err, itemsResult) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: "Error creating order" });
                });
              }

              db.query(
                "INSERT INTO payments (order_id, payment_method) VALUES (?, ?)",
                [orderId, paymentMethod || "Credit Card"],
                (err, paymentResult) => {
                  if (err) {
                    return db.rollback(() => {
                      res
                        .status(500)
                        .json({ message: "Error processing payment" });
                    });
                  }

                  db.query(
                    "DELETE FROM cart WHERE user_id = ?",
                    [userId],
                    (err, clearResult) => {
                      if (err) {
                        return db.rollback(() => {
                          res
                            .status(500)
                            .json({ message: "Error creating order" });
                        });
                      }

                      db.commit((err) => {
                        if (err) {
                          return db.rollback(() => {
                            res
                              .status(500)
                              .json({ message: "Error creating order" });
                          });
                        }

                        res.status(201).json({
                          message: "Order created successfully",
                          orderId: orderId,
                          totalAmount: totalAmount,
                          itemCount: cartItems.length,
                          paymentId: paymentResult.insertId,
                          paymentStatus: "Pending",
                        });
                      });
                    },
                  );
                },
              );
            },
          );
        },
      );
    });
  });
});

/********************************************************
 * GET USER ORDERS
 ********************************************************/
router.get("/", isRegularUser, (req, res) => {
  const userId = req.session.user.id;
  const statusFilter = req.query.status;

  let query = `
    SELECT o.order_id, o.total_amount, o.order_date, o.status as order_status,
           p.payment_method
    FROM orders o
    LEFT JOIN payments p ON o.order_id = p.order_id
    WHERE o.user_id = ?
  `;

  const queryParams = [userId];

  if (statusFilter && statusFilter !== "All") {
    query += ` AND o.status = ?`;
    queryParams.push(statusFilter);
  }

  query += ` ORDER BY o.order_id DESC`;

  const countQuery = `
    SELECT o.status as status, COUNT(*) as count
    FROM orders o
    WHERE o.user_id = ?
    GROUP BY o.status
    ORDER BY o.status DESC
  `;

  db.query(countQuery, [userId], (err, statusResults) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching orders" });
    }

    const statusCounts = {};
    let totalCount = 0;

    statusResults.forEach((row) => {
      statusCounts[row.status || "Unknown"] = row.count;
      totalCount += row.count;
    });

    db.query(query, queryParams, (err, orders) => {
      if (err) {
        return res.status(500).json({ message: "Error fetching orders" });
      }

      if (orders.length === 0) {
        return res.status(200).json({
          orders: [],
          statusCounts,
        });
      }

      const orderIds = orders.map((order) => order.order_id);
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
          return res
            .status(500)
            .json({ message: "Error fetching order items" });
        }

        const itemsByOrder = {};
        allItems.forEach((item) => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push({
            ...item,
            title: item.title || "Unknown",
            price: item.price || 0,
            gameicon: item.gameicon || "default-icon.png",
            subtotal: item.subtotal || 0,
          });
        });

        const ordersWithItems = orders.map((order) => ({
          ...order,
          items: itemsByOrder[order.order_id] || [],
        }));

        res.status(200).json({
          orders: ordersWithItems,
          statusCounts,
        });
      });
    });
  });
});

/********************************************************
 * SEARCH ORDERS BY ID
 ********************************************************/
router.get("/search", isRegularUser, (req, res) => {
  const userId = req.session.user.id;
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  let query = `
    SELECT o.order_id, o.total_amount, o.order_date, o.status as order_status,
           p.payment_method
    FROM orders o
    LEFT JOIN payments p ON o.order_id = p.order_id
    WHERE o.user_id = ? AND o.order_id = ?
  `;

  db.query(query, [userId, orderId], (err, orders) => {
    if (err) {
      return res.status(500).json({ message: "Error searching order" });
    }

    if (orders.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const orderIds = orders.map((order) => order.order_id);
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
        return res.status(500).json({ message: "Error fetching order items" });
      }

      const itemsByOrder = {};
      allItems.forEach((item) => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push({
          ...item,
          title: item.title || "Unknown",
          price: item.price || 0,
          gameicon: item.gameicon || "default-icon.png",
          subtotal: item.subtotal || 0,
        });
      });

      const ordersWithItems = orders.map((order) => ({
        ...order,
        items: itemsByOrder[order.order_id] || [],
      }));

      res.status(200).json({
        order: ordersWithItems[0],
      });
    });
  });
});

module.exports = router;
