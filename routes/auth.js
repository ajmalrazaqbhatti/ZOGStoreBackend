/********************************************************
 * IMPORTS & SETUP
 ********************************************************/
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');




/********************************************************
 * USER SIGNUP
 ********************************************************/
router.post('/signup', async (req, res) => {
  console.log('Signup endpoint hit');
  console.log('Request body:', req.body);
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log('Attempting to insert new user');
      db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        (err, result) => {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ message: 'Error creating user' });
          }
          console.log('User created successfully with ID:', result.insertId);
          return res.status(201).json({ 
            message: 'User registered successfully',
            userId: result.insertId 
          });
        }
      );
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
/****************************************************************************/





/********************************************************
 * USER LOGIN
 ********************************************************/
router.post('/login', async (req, res) => {
  console.log('Login endpoint hit');
  console.log('Request body:', req.body);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (results.length === 0) {
        console.log('User not found');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const user = results[0];
      
      console.log('User from database:', user);
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        console.log('Password does not match');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const userWithoutPassword = {
        id: user.id || user.user_id || user.userId || null,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      };
      
      if (req.session) {
        req.session.user = userWithoutPassword;
        req.session.isAuthenticated = true;
        
        console.log('Session created successfully:');
        console.log('Session ID:', req.sessionID);
        console.log('Session data:', req.session);
        console.log('Authentication status:', req.session.isAuthenticated);
      } else {
        console.warn('Session is not available. Make sure express-session middleware is properly configured.');
      }
      
      console.log('User logged in successfully:', userWithoutPassword);
      return res.status(200).json({ 
        message: 'Login successful',
        user: userWithoutPassword,
        sessionId: req.sessionID,
        isAuthenticated: req.session ? req.session.isAuthenticated : false
      });
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
/****************************************************************************/






/********************************************************
 * USER LOGOUT
 ********************************************************/
router.get('/logout', (req, res) => {
  console.log('Logout endpoint hit');
  
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({ message: 'Failed to logout' });
    }
    
    res.clearCookie('connect.sid', { path: '/' });
    console.log('User logged out successfully');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});
/*******************************************************************/









/********************************************************************************
 AUTH STATUS
*****************************************************************************/
router.get('/status', (req, res) => {
  console.log('Auth status check endpoint hit');
  
  try {
    const isLoggedIn = req.session && req.session.isAuthenticated === true;
    
    res.status(200).json({
      isAuthenticated: isLoggedIn,
      user: isLoggedIn ? req.session.user : null
    });
  } catch (error) {
    console.error('Error checking authentication status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
/*******************************************************************/




module.exports = router;
