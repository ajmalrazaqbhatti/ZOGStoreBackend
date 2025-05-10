/********************************************************
 * AUTHENTICATION MIDDLEWARE
 ********************************************************/
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.isAuthenticated && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin privileges required' });
};

const isRegularUser = (req, res, next) => {
  if (req.session && req.session.isAuthenticated && 
      (req.session.user.role === 'user' || !req.session.user.role)) {
    return next();
  }
  res.status(403).json({ message: 'Regular user privileges required' });
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isRegularUser
};
