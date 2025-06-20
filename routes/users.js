const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserPassword,
  createUser,
  getUserStats
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { validateRegister, validateProfileUpdate, handleValidationErrors } = require('../middleware/validation');

// All routes require admin authentication
router.use(auth);
router.use(admin);

// Get user statistics
router.get('/stats', getUserStats);

// Get all users with pagination and filters
router.get('/', getAllUsers);

// Create a new user
router.post('/', 
  validateRegister, 
  createUser
);
// Get a user by ID with their reservations
router.get('/:id', getUserById);

// Modify a user
router.put('/:id', 
  validateProfileUpdate, 
  updateUser
);

// Change a user's password
router.patch('/:id/password', changeUserPassword);

// Delete a user
router.delete('/:id', deleteUser);

module.exports = router;