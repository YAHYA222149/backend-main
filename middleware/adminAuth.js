// Middleware to check administrator permissions

const adminOnly = (req, res, next) => {
  try {
    // Check if the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      console.log(`❌ Access denied for user ${req.user.email} - Role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator rights required.'
      });
    }

    console.log(`✅ Admin access granted for user ${req.user.email}`);
    next();

  } catch (error) {
    console.error('// Optional middleware for routes that can be public or admin', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Optional middleware for routes that can be public or admin
const adminOrPublic = (req, res, next) => {
  // If the user is logged in and an admin, they can see everything.
// Otherwise, we can filter the results in the route.
  next();
};

module.exports = {
  adminOnly,
  adminOrPublic
};