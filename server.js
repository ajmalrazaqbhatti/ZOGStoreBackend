/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require('express');
const cors = require('cors'); 
const session = require('express-session');
require('dotenv').config();

const gamesRoutes = require('./routes/games');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3000;

/********************************************************
 * MIDDLEWARE CONFIGURATION
 ********************************************************/
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(session({
  secret: process.env.KEY || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1200000
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Request received`);
  console.log('Request body:', req.body);
  next();
});

/********************************************************
 * ROUTES
 ********************************************************/
app.use('/games', gamesRoutes);
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', ordersRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);

/********************************************************
 * SERVER INITIALIZATION
 ********************************************************/
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Games endpoint: http://localhost:${port}/games`);
  console.log(`Signup endpoint: http://localhost:${port}/signup (POST)`);
});
