const express = require('express');
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  deleteBooking, 
  getAvailableSlots,
  getBookingStats,
  acceptBooking,
  rejectBooking
} = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');
const { 
  validateBooking, 
  validateBookingUpdate,
  handleValidationErrors 
} = require('../middleware/validation');

// ===============================
// PUBLIC ROADS (with authentication)
// ===============================

// ✅ CREATE A BOOKING WITH COMPLETE VALIDATION
router.post('/',
  authenticate,
  validateBooking,
  handleValidationErrors,
  createBooking
);

// Get the reservations of the logged in user
router.get('/my-bookings',
  authenticate,
  getUserBookings
);

// Get available slots
router.get('/available-slots',
  authenticate,
  getAvailableSlots
);

router.post('/check-availability',
  authenticate,
  async (req, res) => {
    try {
      const { serviceId, bookingDate, startTime, endTime, excludeBookingId } = req.body;
      
      // Validation of required fields
      if (!serviceId || !bookingDate || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis'
        });
      }

      const Booking = require('../models/Booking');
      
     // Build the conflict query
      const conflictQuery = {
        service: serviceId,
        bookingDate: new Date(bookingDate),
        status: { $in: ['pending', 'confirmed'] }, // Exclude canceled/finished
        $or: [
          { 
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ]
      };
      
      // Exclude the reservation currently being modified
      if (excludeBookingId) {
        conflictQuery._id = { $ne: excludeBookingId };
      }
      
      // Vérifier les conflits
      const conflictingBookings = await Booking.find(conflictQuery);
      
      res.json({
        success: true,
        data: {
          available: conflictingBookings.length === 0,
          conflicts: conflictingBookings.length
        }
      });
      
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking availability'
      });
    }
  }
);

// ===============================
// ADMIN ROUTES - IMPORTANT: Put them BEFORE the routes with :id
// ===============================

router.get('/admin/all',
  authenticate,
  adminOnly,
  getAllBookings
);

router.get('/admin/stats',
  authenticate,
  adminOnly,
  getBookingStats
);

// ✅ ACCEPT A RESERVATION (Admin)
router.patch('/:id/accept',
  authenticate,
  adminOnly,
  acceptBooking
);

// ✅ REFUSER UNE RÉSERVATION (Admin)
router.patch('/:id/reject',
  authenticate,
  adminOnly,
  rejectBooking
);

// ===============================
// ROUTES WITH PARAMETERS - PUT AT THE END
// ===============================

// Obtenir une réservation par ID
router.get('/:id',
  authenticate,
  getBookingById
);

// ✅ MODIFY A RESERVATION WITH VALIDATION
router.put('/:id',
  authenticate,
  validateBookingUpdate,
  handleValidationErrors,
  updateBooking
);

// Cancel a reservation (changes the status)
router.patch('/:id/cancel',
  authenticate,
  cancelBooking
);

// ✅ NEW: Permanently delete a reservation
router.delete('/:id',
  authenticate,
  deleteBooking
);

module.exports = router;