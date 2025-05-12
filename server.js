/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require("express");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

// Import all our route files
const gamesRoutes = require("./routes/games");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const ordersRoutes = require("./routes/orders");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");

// Create Express app and set port
const app = express();
const port = process.env.PORT || 3000;

/********************************************************
 * MIDDLEWARE CONFIGURATION
 ********************************************************/
// Setup CORS to allow our frontend to communicate with the API
const allowedOrigins = [
  "http://localhost:5173",
  "https://zog-store-ui.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
      secure: true, // Enable secure cookies for production
      sameSite: "none", // Allow cross-site cookies
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
