/********************************************************
 * AUTHENTICATION MIDDLEWARE
 ********************************************************/
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized - Please login to access this resource' });
};

/**
 * Check if user has admin role
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.isAuthenticated && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin privileges required' });
};

/**
 * Check if user has regular user role (not admin)
 */
const isRegularUser = (req, res, next) => {
  if (req.session && req.session.isAuthenticated && req.session.user.role !== 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Regular user account required' });
};

module.exports = { isAuthenticated, isAdmin, isRegularUser };
