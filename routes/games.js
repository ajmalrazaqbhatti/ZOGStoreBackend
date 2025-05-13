/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
import express from "express";
import db from "../db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.use(isAuthenticated);

/********************************************************
 * GET ALL GAMES
 ********************************************************/
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM games WHERE is_deleted = FALSE OR is_deleted IS NULL ORDER BY game_id DESC",
    (err, results) => {
      if (err) {
        res.status(500).send("Error fetching data");
      } else {
        res.json(results);
      }
    }
  );
});

/********************************************************
 * FILTER GAMES BY GENRE
 ********************************************************/
router.get("/filter", (req, res) => {
  const { genre } = req.query;

  db.query(
    "SELECT * FROM games WHERE genre = ? AND (is_deleted = FALSE OR is_deleted IS NULL) ORDER BY game_id DESC",
    [genre],
    (err, results) => {
      if (err) {
        res.status(500).send("Error fetching data");
      } else {
        res.json(results);
      }
    }
  );
});

/********************************************************
 * GET ALL GENRES
 ********************************************************/
router.get("/genres", (req, res) => {
  db.query(
    "SELECT DISTINCT genre FROM games WHERE is_deleted = FALSE OR is_deleted IS NULL ORDER BY genre DESC",
    (err, results) => {
      if (err) {
        res.status(500).send("Error fetching genre data");
      } else {
        res.json(results);
      }
    }
  );
});

/********************************************************
 * SEARCH GAMES BY TITLE
 ********************************************************/
router.get("/search", (req, res) => {
  const { title } = req.query;

  if (!title) {
    return res.status(400).json({ error: "Search term is required" });
  }

  const searchQuery = `
    SELECT games.*, inventory.stock_quantity 
    FROM games 
    LEFT JOIN inventory ON games.game_id = inventory.game_id 
    WHERE games.title LIKE ? AND (games.is_deleted = FALSE OR games.is_deleted IS NULL) 
    ORDER BY games.game_id DESC
  `;

  db.query(searchQuery, [`%${title}%`], (err, results) => {
    if (err) {
      return res.status(500).send("Error searching games");
    }
    res.json(results);
  });
});

/********************************************************
 * GET GAME BY ID
 ********************************************************/
router.get("/game", (req, res) => {
  const { gameId } = req.query;

  const query = `
    SELECT games.*, inventory.stock_quantity 
    FROM games 
    LEFT JOIN inventory ON games.game_id = inventory.game_id 
    WHERE games.game_id = ? AND (games.is_deleted = FALSE OR is_deleted IS NULL)
  `;

  db.query(query, [gameId], (err, results) => {
    if (err) {
      return res.status(500).send("Error fetching game details");
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json(results[0]);
  });
});

export default router;
