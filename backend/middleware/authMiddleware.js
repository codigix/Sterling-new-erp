const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Handle demo token (ONLY permitted during local development/demo mode)
  if (token === 'demo-token') {
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ message: 'Demo access disabled in production' });
    }
    // Populate fake context in dev mode for compatibility with downstream controller tracking
    req.user = { id: 9999, fullName: 'Demo User', role: 'Demo', department: 'Demo' };
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    
    // In production, throw a fatal error if the secret environment variable is missing
    if (!secret && process.env.NODE_ENV === 'production') {
      console.error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
      return res.status(500).json({ message: 'Internal server security misconfiguration' });
    }

    const decoded = jwt.verify(token, secret || 'sterling_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
