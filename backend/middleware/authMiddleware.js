const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Handle demo token
  if (token === 'demo-token') {
    // In a real implementation, you'd populate req.user from demo data
    // but here we just pass it for compatibility with the frontend context
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sterling_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
