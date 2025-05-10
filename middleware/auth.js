/********************************************************
 * AUTHENTICATION MIDDLEWARE
 ********************************************************/

/**
 * Check if user is logged in
 * This middleware makes sure the user has a valid session
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    // User is logged in, proceed to the next middleware or route handler
    return next();
  }
  // User is not logged in, send 401 Unauthorized
  return res.status(401).json({ message: 'Unauthorized - Please login to access this resource' });
};

/**
 * Check if user has admin role
 * This middleware makes sure the user is an admin
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.isAuthenticated && req.session.user.role === 'admin') {
    // User is an admin, proceed to the next middleware or route handler
    return next();
  }
  // User is not an admin, send 403 Forbidden
  return res.status(403).json({ message: 'Access denied: Admin privileges required' });
};

/**
 * Check if user has regular user role (not admin)
 * This middleware makes sure the user is a regular user
 */
const isRegularUser = (req, res, next) => {
  if (req.session && req.session.isAuthenticated && req.session.user.role !== 'admin') {
    // User is a regular user, proceed to the next middleware or route handler
    return next();
  }
  // User is not a regular user (maybe an admin or not logged in), send 403 Forbidden
  return res.status(403).json({ message: 'Access denied: Regular user account required' });
};

module.exports = { isAuthenticated, isAdmin, isRegularUser };
