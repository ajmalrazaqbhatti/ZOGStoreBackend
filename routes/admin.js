/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require("express");
const router = express.Router();
const db = require("../db");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const bcrypt = require("bcrypt");

router.use(isAuthenticated);
router.use(isAdmin);

/********************************************************
 * MANAGE GAMES (ADMIN ONLY)
 ********************************************************/
router.post("/games/insert", (req, res) => {
  const { title, description, price, platform, genre, gameicon } = req.body;

  if (!title || !price || !genre) {
    return res.status(400).json({ message: "Required fields missing" });
  }

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
        return res.status(500).json({ message: "Error adding game" });
      }

      const stockQuantity =
        req.body.stock_quantity !== undefined ? req.body.stock_quantity : 0;

      db.query(
        "INSERT INTO inventory (game_id, stock_quantity) VALUES (?, ?)",
        [result.insertId, stockQuantity],
        (err) => {
          if (err) {
            // Log the error but continue
          }

          return res.status(201).json({
            message: "Game added successfully",
            gameId: result.insertId,
            stockQuantity: stockQuantity,
          });
        },
      );
    },
  );
});

router.put("/games/update", (req, res) => {
  const { gameId } = req.query;
  const { title, description, price, platform, genre, gameicon } = req.body;

  if (!gameId) {
    return res.status(400).json({ message: "Game ID is required" });
  }

  let updateFields = [];
  let queryParams = [];

  if (title) {
    updateFields.push("title = ?");
    queryParams.push(title);
  }

  if (description) {
    updateFields.push("description = ?");
    queryParams.push(description);
  }

  if (price) {
    updateFields.push("price = ?");
    queryParams.push(price);
  }

  if (platform) {
    updateFields.push("platform = ?");
    queryParams.push(platform);
  }

  if (genre) {
    updateFields.push("genre = ?");
    queryParams.push(genre);
  }

  if (gameicon) {
    updateFields.push("gameicon = ?");
    queryParams.push(gameicon);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const query = `UPDATE games SET ${updateFields.join(", ")} WHERE game_id = ?`;
  queryParams.push(gameId);

  db.query(query, queryParams, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating game" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Game not found" });
    }

    return res.status(200).json({
      message: "Game updated successfully",
      gameId: gameId,
    });
  });
});

router.delete("/games/delete", (req, res) => {
  const { gameId } = req.query;

  if (!gameId) {
    return res.status(400).json({ message: "Game ID is required" });
  }

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting game" });
    }

    db.query(
      "SELECT COUNT(*) as cart_count FROM cart WHERE game_id = ?",
      [gameId],
      (err, cartResults) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: "Error deleting game" });
          });
        }

        const cartCount = cartResults[0].cart_count;

        if (cartCount > 0) {
          return db.rollback(() => {
            res.status(400).json({
              message: "Cannot delete game that is in active carts",
              inCart: true,
              inOrders: false,
            });
          });
        }

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
              res.status(500).json({ message: "Error deleting game" });
            });
          }

          const activeOrderCount = orderResults[0].active_order_count;

          if (activeOrderCount > 0) {
            return db.rollback(() => {
              res.status(400).json({
                message: "Cannot delete game that is in active orders",
                inCart: false,
                inOrders: true,
              });
            });
          }

          db.query("DELETE FROM cart WHERE game_id = ?", [gameId], (err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ message: "Error deleting game" });
              });
            }

            db.query(
              "UPDATE inventory SET stock_quantity = 0 WHERE game_id = ?",
              [gameId],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: "Error deleting game" });
                  });
                }

                db.query(
                  "UPDATE games SET is_deleted = TRUE WHERE game_id = ?",
                  [gameId],
                  (err, result) => {
                    if (err) {
                      return db.rollback(() => {
                        res
                          .status(500)
                          .json({ message: "Error deleting game" });
                      });
                    }

                    if (result.affectedRows === 0) {
                      return db.rollback(() => {
                        res.status(404).json({ message: "Game not found" });
                      });
                    }

                    db.commit((err) => {
                      if (err) {
                        return db.rollback(() => {
                          res
                            .status(500)
                            .json({ message: "Error deleting game" });
                        });
                      }

                      return res.status(200).json({
                        message: "Game deleted successfully",
                        gameId: gameId,
                      });
                    });
                  },
                );
              },
            );
          });
        });
      },
    );
  });
});

/********************************************************
 * INVENTORY MANAGEMENT (ADMIN ONLY)
 ********************************************************/
router.get("/inventory", (req, res) => {
  const query = `
    SELECT i.inventory_id, i.game_id, i.stock_quantity, g.title, g.gameicon
    FROM inventory i
    JOIN games g ON i.game_id = g.game_id
    ORDER BY i.inventory_id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching inventory" });
    }

    return res.status(200).json(results);
  });
});

router.put("/inventory", (req, res) => {
  const { gameId } = req.query;
  const { stockQuantity } = req.body;

  if (!gameId) {
    return res.status(400).json({ message: "Game ID is required" });
  }

  if (stockQuantity === undefined || stockQuantity < 0) {
    return res
      .status(400)
      .json({ message: "Valid stock quantity is required" });
  }

  db.query(
    "SELECT * FROM inventory WHERE game_id = ?",
    [gameId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Error updating inventory" });
      }

      if (results.length > 0) {
        db.query(
          "UPDATE inventory SET stock_quantity = ? WHERE game_id = ?",
          [stockQuantity, gameId],
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Error updating inventory" });
            }

            return res.status(200).json({
              message: "Inventory quantity updated successfully",
              gameId: gameId,
              stockQuantity: stockQuantity,
            });
          },
        );
      } else {
        db.query(
          "INSERT INTO inventory (game_id, stock_quantity) VALUES (?, ?)",
          [gameId, stockQuantity],
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Error updating inventory" });
            }

            return res.status(201).json({
              message: "Inventory record created successfully",
              gameId: gameId,
              stockQuantity: stockQuantity,
            });
          },
        );
      }
    },
  );
});

/********************************************************
 * ORDER MANAGEMENT (ADMIN ONLY)
 ********************************************************/
router.get("/orders", (req, res) => {
  const query = `
    SELECT o.order_id, o.user_id, o.order_date, o.status, o.total_amount, 
           u.username, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.order_id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching orders" });
    }

    if (results.length === 0) {
      return res.status(200).json([]);
    }

    const orderIds = results.map((order) => order.order_id);

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
        return res.status(500).json({ message: "Error fetching order items" });
      }

      const itemsByOrder = {};
      itemResults.forEach((item) => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      });

      const ordersWithItems = results.map((order) => ({
        ...order,
        items: itemsByOrder[order.order_id] || [],
      }));

      return res.status(200).json(ordersWithItems);
    });
  });
});

router.get("/orders/search", (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  // Search by order ID only
  const query = `
    SELECT o.order_id, o.user_id, o.order_date, o.status, o.total_amount, 
           u.username, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    WHERE o.order_id = ?
  `;

  db.query(query, [orderId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error searching order" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = results[0];

    // Once we find the order by ID, get its items
    const itemsQuery = `
      SELECT oi.game_id, oi.quantity, g.price,
             g.title, g.gameicon, (g.price * oi.quantity) AS subtotal
      FROM order_items oi
      JOIN games g ON oi.game_id = g.game_id
      WHERE oi.order_id = ?
      ORDER BY oi.game_id
    `;

    db.query(itemsQuery, [orderId], (err, itemResults) => {
      if (err) {
        return res.status(500).json({ message: "Error fetching order items" });
      }

      order.items = itemResults;

      return res.status(200).json({
        order: order,
      });
    });
  });
});

router.put("/orders/status", (req, res) => {
  const { orderId } = req.query;
  const { status } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "canceled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid status value",
      validValues: validStatuses,
    });
  }

  const query = "UPDATE orders SET status = ? WHERE order_id = ?";

  db.query(query, [status, orderId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating order status" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      orderId: orderId,
      status: status,
    });
  });
});

router.delete("/orders", (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting order" });
    }

    db.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [orderId],
      (err, results) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: "Error deleting order" });
          });
        }

        if (results.length === 0) {
          return db.rollback(() => {
            res.status(404).json({ message: "Order not found" });
          });
        }

        db.query(
          "DELETE FROM payments WHERE order_id = ?",
          [orderId],
          (err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ message: "Error deleting order" });
              });
            }

            db.query(
              "DELETE FROM order_items WHERE order_id = ?",
              [orderId],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: "Error deleting order" });
                  });
                }
                db.query(
                  "DELETE FROM orders WHERE order_id = ?",
                  [orderId],
                  (err, result) => {
                    if (err) {
                      return db.rollback(() => {
                        res
                          .status(500)
                          .json({ message: "Error deleting order" });
                      });
                    }

                    db.commit((err) => {
                      if (err) {
                        return db.rollback(() => {
                          res
                            .status(500)
                            .json({ message: "Error deleting order" });
                        });
                      }

                      return res.status(200).json({
                        message: "Order deleted successfully",
                        orderId: orderId,
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

/********************************************************
 * USER MANAGEMENT (ADMIN ONLY)
 ********************************************************/
router.get("/users/search", (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).json({ message: "Search query is required" });
  }

  const searchQuery = `
    SELECT user_id, username, email, created_at, role
    FROM users
    WHERE username LIKE ? OR email LIKE ?
    ORDER BY user_id DESC
  `;

  const searchParam = `%${query}%`;

  db.query(searchQuery, [searchParam, searchParam], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error searching users" });
    }

    return res.status(200).json(results);
  });
});

router.get("/users", (req, res) => {
  const query = `
    SELECT user_id, username, email, created_at, role
    FROM users
    ORDER BY user_id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching users" });
    }

    return res.status(200).json(results);
  });
});

router.put("/users", (req, res) => {
  const { userId } = req.query;
  const { username, email, role } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  let updateFields = [];
  let queryParams = [];

  if (username) {
    updateFields.push("username = ?");
    queryParams.push(username);
  }

  if (email) {
    updateFields.push("email = ?");
    queryParams.push(email);
  }

  if (role) {
    const validRoles = ["user", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role value",
        validValues: validRoles,
      });
    }
    updateFields.push("role = ?");
    queryParams.push(role);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const query = `UPDATE users SET ${updateFields.join(", ")} WHERE user_id = ?`;
  queryParams.push(userId);

  db.query(query, queryParams, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating user" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      userId: userId,
    });
  });
});

router.put("/users/password", (req, res) => {
  const { userId } = req.query;
  const { newPassword } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: "Valid password is required (minimum 8 characters)" });
  }

  const saltRounds = 10;

  bcrypt.hash(newPassword, saltRounds, (err, hash) => {
    if (err) {
      return res.status(500).json({ message: "Error changing password" });
    }

    const query = "UPDATE users SET password = ? WHERE user_id = ?";

    db.query(query, [hash, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error changing password" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        message: "Password changed successfully",
        userId: userId,
      });
    });
  });
});

router.delete("/users", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (userId == req.session.user.id) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting user" });
    }

    db.query(
      "SELECT COUNT(*) as order_count FROM orders WHERE user_id = ?",
      [userId],
      (err, orderResults) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: "Error deleting user" });
          });
        }

        if (orderResults[0].order_count > 0) {
          return db.rollback(() => {
            res.status(400).json({
              message: "Cannot delete user with existing orders",
              orderCount: orderResults[0].order_count,
            });
          });
        }

        db.query("DELETE FROM cart WHERE user_id = ?", [userId], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: "Error deleting user" });
            });
          }

          db.query(
            "DELETE FROM users WHERE user_id = ?",
            [userId],
            (err, result) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: "Error deleting user" });
                });
              }

              if (result.affectedRows === 0) {
                return db.rollback(() => {
                  res.status(404).json({ message: "User not found" });
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: "Error deleting user" });
                  });
                }

                return res.status(200).json({
                  message: "User deleted successfully",
                  userId: userId,
                });
              });
            },
          );
        });
      },
    );
  });
});

module.exports = router;
