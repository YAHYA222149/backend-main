const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserPassword,
  createUser,
  getUserStats
} = require('../controllers/userController');

// Import middlewares
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');
const { 
  validateRegister, 
  validateProfileUpdate, 
  handleValidationErrors 
} = require('../middleware/validation');

// Apply authentication and admin rights to all routes
router.use(authenticate);
router.use(adminOnly);

// Routes for user management

// @route   GET /api/admin/users/stats
// @desc    Get user statistics
// @access  Private/Admin
router.get('/users/stats', getUserStats);

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private/Admin
router.get('/users', getAllUsers);

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private/Admin
router.post('/users', 
  validateRegister, 
  handleValidationErrors,
  createUser
);

// @route   GET /api/admin/users/:id
// @desc    Get a user by ID with their bookings
// @access  Private/Admin
router.get('/users/:id', getUserById);

// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private/Admin
router.put('/users/:id', 
  validateProfileUpdate, 
  handleValidationErrors,
  updateUser
);

// @route   PATCH /api/admin/users/:id/password
// @desc    Changer le mot de passe d'un utilisateur
// @access  Private/Admin
router.patch('/users/:id/password', changeUserPassword);
// Dans routes/admin.js ou routes/users.js
router.get('/users/stats', authenticate, adminOnly, getUserStats);
// @route   DELETE /api/admin/users/:id
// @desc    Supprimer un utilisateur
// @access  Private/Admin
router.delete('/users/:id', deleteUser);

module.exports = router;