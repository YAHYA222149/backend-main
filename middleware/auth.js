const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify authentication
const authenticate = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove "Bearer "

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token missing'
      });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get the user from the database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account disabled'
      });
    }

    // Attach the user to the request
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Middleware to verify admin permissions
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Administrator rights required.'
    });
  }
};

// Middleware to verify that the user can access their own data
const authorizeOwnerOrAdmin = (req, res, next) => {
  const userId = req.params.userId || req.params.id;
  
  if (req.user.role === 'admin' || req.user._id.toString() === userId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied to this data'
    });
  }
};

// Optional middleware - does not block if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // In case of error, continue without user
    next();
  }
};

module.exports = {
  authenticate,
  authorizeAdmin,
  authorizeOwnerOrAdmin,
  optionalAuth
};