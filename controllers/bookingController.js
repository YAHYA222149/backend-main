const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { 
  sendBookingConfirmationEmail, 
  sendBookingCancellationEmail 
} = require('../utils/emailService');
const Notification = require('../models/Notification');

// @desc Accept a reservation (Admin)
// @route   PATCH /api/bookings/:id/accept
// @access  Admin
const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    console.log(`✅ PATCH /api/bookings/${id}/accept - Accepting booking`);

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Reservation cannot be accepted because its status is '${booking.status}'` });
    }

    // ✅ UPDATE with new fields
    booking.status = 'confirmed';
    booking.adminNotes = adminNotes || '';
    booking.confirmedAt = new Date();
    booking.lastModifiedBy = req.user._id;
    await booking.save();

    await booking.populate('client', 'firstName lastName email phone');
    await booking.populate('service', 'name price');

    // ✅ NEW: Send confirmation email
    if (booking.client?.email) {
      try {
        await sendBookingConfirmationEmail(booking, booking.client);
        console.log('✅ Confirmation email sent to', booking.client.email);
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError);
      }
    }
    try {
      await Notification.createBookingConfirmation(booking.client._id, booking);
      console.log('✅ Confirmation notification created');
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
    }

    console.log(`✅ Booking ${id} accepted successfully`);
    res.status(200).json({
      success: true,
      message: 'RReservation successfully accepted',
      data: booking
    });

  } catch (error) {
    console.error('❌ Error accepting booking:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// @desc Refuse a reservation (Admin)
// @route   PATCH /api/bookings/:id/reject
// @access  Admin
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    console.log(`❌ PATCH /api/bookings/${id}/reject - Rejecting booking`);

    // ✅ NEW VALIDATION: Reason is required
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'RReservation not found' });
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: `Reservation cannot be rejected because its status is '${booking.status}'` });
    }

    // ✅ UPDATE cancellation structure
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: reason.trim(),
      cancelledBy: req.user._id,
      cancelledAt: new Date()
    };
    booking.lastModifiedBy = req.user._id;
    await booking.save();

    await booking.populate('client', 'firstName lastName email phone');
    await booking.populate('service', 'name price');

    // ✅ NEW: Send cancellation email
    if (booking.client?.email) {
      try {
        await sendBookingCancellationEmail(booking, booking.client, reason.trim());
        console.log('✅ Cancellation email sent to', booking.client.email);
      } catch (emailError) {
        console.error('❌ Error sending cancellation email:', emailError);
      }
    }

    // ✅ NEW: Create notification
    try {
      await Notification.createBookingCancellation(booking.client._id, booking, reason.trim());
      console.log('✅ Cancellation notification created');
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
    }

    console.log(`❌ Booking ${id} rejected successfully`);
    res.status(200).json({
      success: true,
      message: 'Reservation successfully declined',
      data: booking
    });

  } catch (error) {
    console.error('❌ Error rejecting booking:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
// @desc Permanently delete a reservation
// @route   DELETE /api/bookings/:id
// @access  Admin or Owner
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    console.log(`🗑️ DELETE /api/bookings/${id} - Deleting booking`);

    // Find the reservation
    const booking = await Booking.findById(id).populate('service client');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    if (!isAdmin && booking.client._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this reservation.'
      });
    }

    // Delete the reservation from the database
    await Booking.findByIdAndDelete(id);

   // Delete notifications related to this reservation
    await Notification.deleteMany({ 'data.bookingId': id });

    console.log(`✅ Booking ${id} permanently deleted by ${isAdmin ? 'admin' : 'user'} ${userId}`);

    res.json({
      success: true,
      message: 'Booking successfully deleted'
    });

  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc Create a new reservation
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  try {
    console.log('📝 POST /api/bookings - Creating new booking');
    console.log('Request body:', req.body);

    const {
      service: serviceId,
      bookingDate,
      startTime,
      endTime,
      participants,
      location,
      photographer,
      specialRequests,
      clientNotes
    } = req.body;

    // ✅ VALIDATION OF REQUIRED DATA
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    if (!bookingDate) {
      return res.status(400).json({
        success: false,
        message: 'Reservation date is required'
      });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start and end times are required'
      });
    }

    // Check that the service exists
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or inactive'
      });
    }

    // ✅ NORMALIZE THE DATE
    const normalizedDate = new Date(bookingDate);
    if (isNaN(normalizedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // ✅ CHECK AVAILABILITY WITH THE CORRECT DATA
    console.log(`🔍 Checking availability for date: ${normalizedDate.toISOString().split('T')[0]}, time: ${startTime} - ${endTime}`);
    
    const isAvailable = await Booking.checkAvailability(
      normalizedDate,
      startTime,
      endTime
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is not available'
      });
    }

    // ✅ VÉRIFIER LE NOMBRE DE PARTICIPANTS
    const participantCount = participants?.count || 1;
    if (participantCount > service.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: `The maximum number of participants for this service is ${service.maxParticipants}`
      });
    }

    // ✅ CALCULER LE PRIX TOTAL
    const totalAmount = service.price * participantCount;

    // ✅ CRÉER LA RÉSERVATION AVEC LA STRUCTURE CORRECTE
    const booking = new Booking({
      client: req.user._id,
      service: serviceId,
      bookingDate: normalizedDate,
      startTime,
      endTime,
      status: 'pending',
      pricing: {
        basePrice: service.price,
        totalAmount: totalAmount,
        currency: 'MAD'
      },
      participants: {
        count: participantCount,
        details: participants?.details || []
      },
      location: {
        type: location?.type || 'studio',
        address: location?.address || {},
        notes: location?.notes || ''
      },
      photographer: {
        name: photographer?.name || 'À assigner',
        email: photographer?.email || '',
        phone: photographer?.phone || ''
      },
      specialRequests: specialRequests || '',
      clientNotes: clientNotes || '',
      createdBy: req.user._id
    });

    const savedBooking = await booking.save();

    // Populer les références
    await savedBooking.populate([
      { path: 'client', select: 'firstName lastName email phone' },
      { path: 'service', select: 'name description price duration category type' }
    ]);

    console.log('✅ Booking created successfully:', savedBooking._id);

    res.status(201).json({
      success: true,
      message: 'Booking successfully created',
      data: savedBooking
    });

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

// @desc Get the reservations of the logged in user
// @route   GET /api/bookings/my-bookings
// @access  Private
const getUserBookings = async (req, res) => {
  try {
    console.log('📋 GET /api/bookings/my-bookings - User:', req.user._id);

    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'bookingDate',
      sortOrder = 'desc'
    } = req.query;

    // Build the filter
    const filter = { client: req.user._id };
    if (status) filter.status = status;

    // Build the sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute the query
    const [bookings, totalBookings] = await Promise.all([
      Booking.find(filter)
        .populate('service', 'name description price duration category type')
        .populate('client', 'firstName lastName email phone')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter)
    ]);

    // Calculate pagination information
    const totalPages = Math.ceil(totalBookings / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log(`✅ Found ${bookings.length} bookings for user`);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalBookings,
        bookingsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message
    });
  }
};

// @desc Get all bookings (admin)
// @route   GET /api/bookings/admin/all
// @access  Admin
const getAllBookings = async (req, res) => {
  try {
    console.log('📋 GET /api/bookings/admin/all - Admin request');

    const {
      page = 1,
      limit = 10,
      status,
      photographer,
      date,
      client,
      service,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build the filter
    const filter = {};
    if (status) filter.status = status;
    if (photographer) filter['photographer.name'] = new RegExp(photographer, 'i');
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.bookingDate = { $gte: startDate, $lt: endDate };
    }
    if (client) filter.client = client;
    if (service) filter.service = service;

   // Build the sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

   // Execute the query
    const [bookings, totalBookings] = await Promise.all([
      Booking.find(filter)
        .populate('service', 'name description price duration category type')
        .populate('client', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter)
    ]);

    // Calculate pagination information
    const totalPages = Math.ceil(totalBookings / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log(`✅ Found ${bookings.length} total bookings`);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalBookings,
        bookingsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('❌ Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching all bookings',
      error: error.message
    });
  }
};

// @desc Get a reservation by ID
// @route   GET /api/bookings/:id
// @access  Private (owner or admin)
const getBookingById = async (req, res) => {
  try {
    console.log(`📋 GET /api/bookings/${req.params.id}`);

    const booking = await Booking.findById(req.params.id)
      .populate('service', 'name description price duration category type')
      .populate('client', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && booking.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking'
      });
    }

    console.log('✅ Booking found:', booking._id);

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('❌ Error fetching booking:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error retrieving booking',
      error: error.message
    });
  }
};

// @desc    Modifier une réservation
// @route   PUT /api/bookings/:id
// @access  Private (owner or admin)
const updateBooking = async (req, res) => {
  try {
    console.log(`📝 PUT /api/bookings/${req.params.id} - Updating booking`);
    console.log('Update data:', req.body);

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette réservation'
      });
    }

    // Vérifier si la réservation peut être modifiée
    if (!booking.isEditable && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation ne peut plus être modifiée'
      });
    }

    const {
      bookingDate,
      startTime,
      endTime,
      participants,
      location,
      photographer,
      specialRequests,
      clientNotes,
      adminNotes,
      status
    } = req.body;

    // If dates/times change, check availability
    if (bookingDate || startTime || endTime) {
      const newDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
      const newStartTime = startTime || booking.startTime;
      const newEndTime = endTime || booking.endTime;

      const isAvailable = await Booking.checkAvailability(
        newDate,
        newStartTime,
        newEndTime,
        booking._id
      );

      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'This new slot is not available'
        });
      }
    }

    // Mettre à jour les champs autorisés
    if (bookingDate) booking.bookingDate = bookingDate;
    if (startTime) booking.startTime = startTime;
    if (endTime) booking.endTime = endTime;
    if (participants) booking.participants = participants;
    if (location) booking.location = location;
    if (photographer) booking.photographer = photographer;
    if (specialRequests !== undefined) booking.specialRequests = specialRequests;
    if (clientNotes !== undefined) booking.clientNotes = clientNotes;

    // Champs admin seulement
    if (req.user.role === 'admin') {
      if (adminNotes !== undefined) booking.adminNotes = adminNotes;
      if (status && status !== booking.status) {
        booking.status = status;
        booking.statusHistory.push({
          status: status,
          changedBy: req.user._id,
          reason: 'Modification admin'
        });
      }
    }

    booking.lastModifiedBy = req.user._id;

    const updatedBooking = await booking.save();
    await updatedBooking.populate([
      { path: 'client', select: 'firstName lastName email phone' },
      { path: 'service', select: 'name description price duration category type' }
    ]);

    console.log('✅ Booking updated successfully:', updatedBooking._id);

    res.json({
      success: true,
      message: 'Reservation successfully updated',
      data: updatedBooking
    });

  } catch (error) {
    console.error('❌ Error updating booking:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error.message
    });
  }
};

// @desc Cancel a reservation
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (owner or admin)
const cancelBooking = async (req, res) => {
  try {
    console.log(`🚫 PATCH /api/bookings/${req.params.id}/cancel`);

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking'
      });
    }

    // Check if the booking can be cancelled
    if (!booking.isCancellable && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'This booking can no longer be cancelled (less than 24h before)'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already cancelled'
      });
    }

    const reason = req.body.reason || 'Cancellation by client';

    // Use the model method to cancel
    await booking.cancel(reason, req.user._id);

    await booking.populate([
      { path: 'client', select: 'firstName lastName email phone' },
      { path: 'service', select: 'name description price duration category type' }
    ]);

    console.log(`✅ Booking cancelled: ${booking._id}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });

  } catch (error) {
    console.error('❌ Error cancelling booking:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error canceling reservation',
      error: error.message
    });
  }
};

// @desc    Obtenir les créneaux disponibles
// @route   GET /api/bookings/available-slots
// @access  Private
const getAvailableSlots = async (req, res) => {
  try {
    console.log('🕐 GET /api/bookings/available-slots');

    const { date, serviceId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    let duration = 60; // Durée par défaut

    // Si un service est spécifié, récupérer sa durée
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service) {
        duration = service.duration;
      }
    }

    const availableSlots = await Booking.getAvailableSlots(
      new Date(date),
      duration
    );

    console.log(`✅ Found ${availableSlots.length} available slots for ${date}`);

    res.json({
      success: true,
      data: availableSlots
    });

  } catch (error) {
    console.error('❌ Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving available slots',
      error: error.message
    });
  }
};

// @desc Get booking statistics (admin)
// @route   GET /api/bookings/admin/stats
// @access  Admin
const getBookingStats = async (req, res) => {
  try {
    console.log('📊 GET /api/bookings/admin/stats');

    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const stats = await Booking.getStats(filters);

    // Statistiques supplémentaires
    const additionalStats = await Booking.aggregate([
      {
        $match: {
          ...(filters.startDate && { createdAt: { $gte: filters.startDate } }),
          ...(filters.endDate && { createdAt: { $lte: filters.endDate } })
        }
      },
      {
        $group: {
          _id: null,
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalDiscounts: { $sum: '$pricing.discount' },
          mostPopularService: { 
            $push: '$service' 
          },
          mostActivePhotographer: {
            $push: '$photographer.name'
          }
        }
      }
    ]);

    // Count occurrences for popular services and photographers
    const serviceCount = {};
    const photographerCount = {};

    if (additionalStats.length > 0) {
      additionalStats[0].mostPopularService.forEach(serviceId => {
        serviceCount[serviceId] = (serviceCount[serviceId] || 0) + 1;
      });

      additionalStats[0].mostActivePhotographer.forEach(photographer => {
        photographerCount[photographer] = (photographerCount[photographer] || 0) + 1;
      });
    }

    console.log('✅ Stats calculated successfully');

    res.json({
      success: true,
      data: {
        ...stats,
        averageBookingValue: additionalStats[0]?.averageBookingValue || 0,
        totalDiscounts: additionalStats[0]?.totalDiscounts || 0,
        popularServices: Object.entries(serviceCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([serviceId, count]) => ({ serviceId, count })),
        activePhotographers: Object.entries(photographerCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
      error: error.message
    });
  }
};
module.exports = {
  createBooking,
  getUserBookings,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  getAvailableSlots,
  getBookingStats,
  acceptBooking,
  rejectBooking,
  deleteBooking  
};