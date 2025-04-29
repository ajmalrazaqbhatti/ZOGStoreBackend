const express = require('express');
const cors = require('cors'); 
const session = require('express-session'); // Add session import
require('dotenv').config();

// Import routes
const gamesRoutes = require('./routes/games');
const authRoutes = require('./routes/auth');

// setup express app at port 3000
const app = express();
const port = process.env.PORT || 3000;

//allow cross-origin requests from the frontend
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Configure session middleware (add this before routes)
app.use(session({
  secret: process.env.KEY || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1200000
  }
}));

// parse application/json
app.use(express.json());
// Add urlencoded parser for form submissions
app.use(express.urlencoded({ extended: true }));

// Middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Request received`);
  console.log('Request body:', req.body);
  next();
});

// Routes
app.use('/games', gamesRoutes);
app.use('/', authRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Games endpoint: http://localhost:${port}/games`);
  console.log(`Signup endpoint: http://localhost:${port}/signup (POST)`);
});
