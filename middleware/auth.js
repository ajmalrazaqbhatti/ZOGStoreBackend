const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized - Please login to access this resource' });
};

module.exports = { isAuthenticated };
