/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Initialize dotenv
dotenv.config();

// Import all our route files
import gamesRoutes from "./routes/games.js";
import authRoutes from "./routes/auth.js";
import cartRoutes from "./routes/cart.js";
import ordersRoutes from "./routes/orders.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminRoutes from "./routes/admin.js";

// Create Express app and set port
const app = express();
const port = process.env.PORT || 3000;

/********************************************************
 * MIDDLEWARE CONFIGURATION
 ********************************************************/
// Setup CORS to allow our frontend to communicate with the API
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Set up sessions for user login state
app.use(
  session({
    secret: process.env.KEY || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1200000, // 20 minutes session timeout
    },
  })
);

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/********************************************************
 * ROUTES
 ********************************************************/
// Mount all the route modules at their respective endpoints
app.use("/games", gamesRoutes);
app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", ordersRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes);

/********************************************************
 * SERVER INITIALIZATION
 ********************************************************/
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
