/********************************************************
 * DATABASE CONNECTION
 ********************************************************/
const mysql = require('mysql2');
require('dotenv').config();

// Create a database connection using environment variables
// with fallbacks to default values
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',    // Database server address
  port: parseInt(process.env.DB_PORT || '3306'),// Database port (MySQL default is 3306)
  user: process.env.DB_USER || 'root',         // Database username
  password: process.env.DB_PASSWORD || '',      // Database password
  database: process.env.DB_NAME || 'gamestore'  // Database name
});

module.exports = db;
