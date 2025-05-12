/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require("express");
const router = express.Router();
const db = require("../db");
const { isAuthenticated, isRegularUser } = require("../middleware/auth");

router.use(isAuthenticated);
router.use(isRegularUser);

/********************************************************
 * GET CART ITEMS
 ********************************************************/
router.get("/", (req, res) => {
  const userId = req.session.user.id;

  const query = `
    SELECT c.cart_id, c.user_id, c.game_id, c.quantity, 
           g.title, g.price, g.gameicon, 
           (c.quantity * g.price) as subtotal
    FROM cart c
    JOIN games g ON c.game_id = g.game_id
    WHERE c.user_id = ?
    ORDER BY c.cart_id DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching cart items" });
    }

    const total = results.reduce((sum, item) => sum + item.subtotal, 0);

    res.json({
      cartItems: results,
      total: total,
      itemCount: results.length,
    });
  });
});

/********************************************************
 * GET CART ITEM COUNT
 ********************************************************/
router.get("/count", (req, res) => {
  const userId = req.session.user.id;

  const query = "SELECT COUNT(*) as itemCount FROM cart WHERE user_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error counting cart items" });
    }

    const itemCount = results[0].itemCount || 0;

    res.json({ itemCount });
  });
});

/********************************************************
 * ADD ITEM TO CART
 ********************************************************/
router.post("/add", (req, res) => {
  const userId = req.session.user.id;
  const { gameId, quantity = 1 } = req.body;

  if (!gameId) {
    return res.status(400).json({ message: "Game ID is required" });
  }

  db.query(
    "SELECT stock_quantity FROM inventory WHERE game_id = ?",
    [gameId],
    (err, inventoryResults) => {
      if (err) {
        return res.status(500).json({ message: "Server error" });
      }

      if (inventoryResults.length === 0) {
        return res
          .status(404)
          .json({ message: "Product not found in inventory" });
      }

      const availableQuantity = inventoryResults[0].stock_quantity;

      if (quantity > availableQuantity) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
          availableQuantity: availableQuantity,
        });
      }

      db.query(
        "SELECT * FROM cart WHERE user_id = ? AND game_id = ?",
        [userId, gameId],
        (err, results) => {
          if (err) {
            return res.status(500).json({ message: "Server error" });
          }

          if (results.length > 0) {
            return res.status(400).json({
              message:
                "Item already exists in cart. Use update endpoint to modify quantity.",
              cartId: results[0].cart_id,
              currentQuantity: results[0].quantity,
            });
          } else {
            db.query(
              "INSERT INTO cart (user_id, game_id, quantity) VALUES (?, ?, ?)",
              [userId, gameId, quantity],
              (err, insertResult) => {
                if (err) {
                  return res
                    .status(500)
                    .json({ message: "Error adding item to cart" });
                }

                return res.status(201).json({
                  message: "Item added to cart",
                  cartId: insertResult.insertId,
                  quantity: quantity,
                  availableQuantity: availableQuantity,
                });
              },
            );
          }
        },
      );
    },
  );
});

/********************************************************
 * UPDATE CART ITEM
 ********************************************************/
router.post("/update", (req, res) => {
  const userId = req.session.user.id;
  const { cartId, quantity } = req.body;

  if (!cartId) {
    return res.status(400).json({ message: "Cart ID is required" });
  }

  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: "Valid quantity is required" });
  }

  db.query(
    "SELECT c.*, i.stock_quantity FROM cart c JOIN inventory i ON c.game_id = i.game_id WHERE c.cart_id = ? AND c.user_id = ?",
    [cartId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Server error" });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "Cart item not found or unauthorized" });
      }

      const availableQuantity = results[0].stock_quantity;
      const currentQuantity = results[0].quantity;

      if (quantity > availableQuantity) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
          availableQuantity: availableQuantity,
          cartId: cartId,
        });
      }

      if (quantity === currentQuantity) {
        return res.status(200).json({
          message: "No change in quantity",
          cartId: cartId,
          quantity: quantity,
          availableQuantity: availableQuantity,
        });
      }

      db.query(
        "UPDATE cart SET quantity = ? WHERE cart_id = ?",
        [quantity, cartId],
        (err, updateResult) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error updating cart item" });
          }

          return res.status(200).json({
            message: "Cart updated successfully",
            cartId: cartId,
            quantity: quantity,
            availableQuantity: availableQuantity,
          });
        },
      );
    },
  );
});

/********************************************************
 * REMOVE CART ITEM
 ********************************************************/
router.post("/remove", (req, res) => {
  const userId = req.session.user.id;
  const { cartId } = req.body;

  if (!cartId) {
    return res.status(400).json({ message: "Cart ID is required" });
  }

  db.query(
    "SELECT * FROM cart WHERE cart_id = ? AND user_id = ?",
    [cartId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Server error" });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "Cart item not found or unauthorized" });
      }

      db.query(
        "DELETE FROM cart WHERE cart_id = ?",
        [cartId],
        (err, deleteResult) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error removing item from cart" });
          }

          return res.status(200).json({
            message: "Item removed from cart",
            cartId: cartId,
          });
        },
      );
    },
  );
});

module.exports = router;
