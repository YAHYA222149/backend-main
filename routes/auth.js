const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken
} = require('../controllers/authController');
// Import middleware
const { authenticate } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetConfirm
} = require('../middleware/validation');

// Routes publiques
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validatePasswordReset, forgotPassword);
router.put('/reset-password/:token', validatePasswordResetConfirm, resetPassword);

// Protected routes (require authentication)
router.use(authenticate); // All following routes require authentication

router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);

router.put('/change-password', validatePasswordChange, changePassword);
router.get('/verify-token', verifyToken);

module.exports = router;