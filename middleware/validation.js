const { body, validationResult } = require('express-validator');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errorMessages
    });
  }
  
  next();
};

// Validation pour l'inscription
const validateRegister = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('The first name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('The first name must contain between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('The first name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('The last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('The name must contain between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('The name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must contain at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-\(\)]{10,}$/)
    .withMessage('Please enter a valid phone number'),

  body('role')
    .optional()
    .isIn(['client', 'admin'])
    .withMessage('The role must be either "client" or "admin"')
];

// Validation pour la connexion
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation pour la mise à jour du profil
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('The first name must contain between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('The first name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('The name must contain between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('The name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-\(\)]{10,}$/)
    .withMessage('Please enter a valid phone number'),

  body('role')
    .optional()
    .isIn(['client', 'admin'])
    .withMessage('The role must be either "client" or "admin"'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Status must be a boolean')
];

// Validation for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must contain at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

// Validation for password reset
const validatePasswordReset = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
];

// Validation for reset confirmation
const validatePasswordResetConfirm = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must contain at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

// Validation for service creation
const validateService = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('The name must contain between 3 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('The description must be between 10 and 1000 characters long'),

  body('price')
    .isNumeric()
    .withMessage('The price must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('The price must be greater than 0');
      }
      return true;
    }),

  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('The duration must be between 15 and 480 minutes'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['photo', 'video', 'photo-video'])
    .withMessage('Invalid category'),

  body('type')
    .trim()
    .notEmpty()
    .withMessage('Le type est requis')
    .isIn(['portrait', 'mariage', 'evenement', 'entreprise', 'produit', 'immobilier', 'sport', 'nature', 'mode', 'nouveau-ne', 'famille', 'autre'])
    .withMessage('Invalid type'),

  body('maxParticipants')
    .isInt({ min: 1 })
    .withMessage('The maximum number of participants must be at least 1')
];

// VALIDATION FOR RESERVATION - CORRECTED
const validateBooking = [
  body('service')
    .notEmpty()
    .withMessage('Service ID is required')
    .isMongoId()
    .withMessage('Invalid service ID'),

  body('bookingDate')
    .notEmpty()
    .withMessage('Booking date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate <= today) {
        throw new Error('The reservation date must be in the future');
      }
      return true;
    }),

  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),

  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)')
    .custom((endTime, { req }) => {
      if (req.body.startTime) {
        const start = req.body.startTime;
        if (endTime <= start) {
          throw new Error('The end time must be after the start time');
        }
      }
      return true;
    }),

  body('participants.count')
    .optional()
    .isInt({ min: 1 })
    .withMessage('The number of participants must be at least 1'),

  body('location.type')
    .optional()
    .isIn(['studio', 'client-home', 'outdoor', 'event-venue', 'other'])
    .withMessage('Invalid location type'),

  body('photographer.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('The photographer\'s name must be between 2 and 100 characters long'),

  body('photographer.email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid photographer email'),

  body('photographer.phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-\(\)]{10,}$/)
    .withMessage('Invalid photographer phone number'),

  body('specialRequests')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Special requests cannot exceed 1000 characters'),

  body('clientNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Customer notes cannot exceed 500 characters')
];

// VALIDATION FOR RESERVATION UPDATE
const validateBookingUpdate = [
  body('bookingDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (value) {
        const bookingDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (bookingDate <= today) {
          throw new Error('The reservation date must be in the future');
        }
      }
      return true;
    }),

  body('startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),

  body('endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)')
    .custom((endTime, { req }) => {
      if (endTime && req.body.startTime) {
        const start = req.body.startTime;
        if (endTime <= start) {
          throw new Error('The end time must be after the start time');
        }
      }
      return true;
    }),

  body('participants.count')
    .optional()
    .isInt({ min: 1 })
    .withMessage('The number of participants must be at least 1'),

  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid status'),

  body('specialRequests')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Special requests cannot exceed 1000 characters'),

  body('clientNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Customer notes cannot exceed 500 characters'),

  body('adminNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters')
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateService,
  validateBooking,
  validateBookingUpdate
};