const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Reference to the client
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Reference to the service
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },

  // Date and time of reservation
  bookingDate: {
    type: Date,
    required: true
  },

  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },

  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },

  // Statut de la réservation
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },

  // Informations de pricing
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    additionalFees: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'MAD'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partially-paid', 'refunded'],
      default: 'pending'
    }
  },

  // ✅ CHAMPS STRIPE MINIMAUX - AJOUTÉS
  stripeSessionId: {
    type: String,
    sparse: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },

  // Participants
  participants: {
    count: {
      type: Number,
      required: true,
      min: 1
    },
    details: [{
      name: {
        type: String,
        required: true
      },
      age: {
        type: Number,
        min: 0
      },
      role: {
        type: String,
        default: ''
      }
    }]
  },

  // Lieu de la séance
  location: {
    type: {
      type: String,
      enum: ['studio', 'client-home', 'outdoor', 'event-venue', 'other'],
      required: true
    },
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Maroc'
      }
    },
    notes: String
  },

 // Assigned photographer
  photographer: {
    name: {
      type: String,
      default: 'To be assigned'
    },
    email: String,
    phone: String,
    assignedAt: Date
  },

  // Notes et demandes
  specialRequests: {
    type: String,
    maxlength: 1000
  },

  clientNotes: {
    type: String,
    maxlength: 500
  },

  adminNotes: {
    type: String,
    maxlength: 1000
  },

  // History of status changes
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  // Cancellation information
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    refundStatus: {
      type: String,
      enum: ['none', 'partial', 'full', 'pending'],
      default: 'none'
    }
  },

  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===============================
// VIRTUALS - INCHANGÉS
// ===============================
// Virtual for duration in minutes
bookingSchema.virtual('durationMinutes').get(function() {
  if (!this.startTime || !this.endTime) return 0;
  
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
});

// Virtual pour la durée formatée
bookingSchema.virtual('formattedDuration').get(function() {
  const minutes = this.durationMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
});

// Virtual for the formatted price
bookingSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: this.pricing.currency
  }).format(this.pricing.totalAmount);
});

// Virtual for checking if editable
bookingSchema.virtual('isEditable').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

// Virtual for checking if cancellable
bookingSchema.virtual('isCancellable').get(function() {
  const now = new Date();
  const bookingDateTime = new Date(`${this.bookingDate.toISOString().split('T')[0]}T${this.startTime}`);
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
  
  return ['pending', 'confirmed'].includes(this.status) && hoursUntilBooking > 24;
});

// ✅ VIRTUAL AJOUTÉ POUR LE PAIEMENT
bookingSchema.virtual('isPayable').get(function() {
  return this.status === 'pending' && this.pricing.paymentStatus === 'pending';
});

// ✅ VIRTUAL POUR VÉRIFIER SI EN ATTENTE DE CONFIRMATION ADMIN
bookingSchema.virtual('needsConfirmation').get(function() {
  return this.status === 'pending' && this.pricing.paymentStatus === 'paid';
});

// ===============================
// METHODES D'INSTANCE - INCHANGÉES
// ===============================

// Method to confirm a booking
bookingSchema.methods.confirm = function(confirmedBy) {
  this.status = 'confirmed';
  this.statusHistory.push({
    status: 'confirmed',
    changedBy: confirmedBy,
    reason: 'Reservation confirmed'
  });
  this.lastModifiedBy = confirmedBy;
  
  return this.save();
};

// Method to cancel a reservation
bookingSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellation = {
    reason: reason,
    cancelledBy: cancelledBy,
    cancelledAt: new Date()
  };
  this.statusHistory.push({
    status: 'cancelled',
    changedBy: cancelledBy,
    reason: reason
  });
  this.lastModifiedBy = cancelledBy;
  
  return this.save();
};

// Method to mark as completed
bookingSchema.methods.complete = function(completedBy) {
  this.status = 'completed';
  this.statusHistory.push({
    status: 'completed',
    changedBy: completedBy,
    reason: 'Session completed'
  });
  this.lastModifiedBy = completedBy;
  
  return this.save();
};

// Method to start the session
bookingSchema.methods.startSession = function(startedBy) {
  this.status = 'in-progress';
  this.statusHistory.push({
    status: 'in-progress',
    changedBy: startedBy,
    reason: 'Session started'
  });
  this.lastModifiedBy = startedBy;
  
  return this.save();
};

// ===============================
// METHODES STATIQUES - INCHANGÉES
// ===============================

// Check slot availability
bookingSchema.statics.checkAvailability = async function(date, startTime, endTime, excludeBookingId = null) {
  try {
    console.log(`🔍 Checking availability for ${date.toISOString().split('T')[0]} from ${startTime} to ${endTime}`);

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const query = {
      bookingDate: {
        $gte: bookingDate,
        $lt: nextDay
      },
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    console.log('🔍 Query:', JSON.stringify(query, null, 2));

    const conflictingBookings = await this.find(query);
    console.log(`📋 Found ${conflictingBookings.length} conflicting bookings`);

    if (conflictingBookings.length > 0) {
      console.log('❌ Conflicting bookings:', conflictingBookings.map(b => ({
        id: b._id,
        date: b.bookingDate,
        time: `${b.startTime}-${b.endTime}`,
        status: b.status
      })));
    } else {
      console.log('✅ No conflicts found - slot is available');
    }

    return conflictingBookings.length === 0;
  } catch (error) {
    console.error('❌ Error in checkAvailability:', error);
    throw error;
  }
};

// Get available slots for a date
bookingSchema.statics.getAvailableSlots = async function(date, duration = 60) {
  const workStart = 9 * 60; // 9h00
  const workEnd = 18 * 60;  // 18h00
  const slots = [];

  const existingBookings = await this.find({
    bookingDate: date,
    status: { $in: ['confirmed', 'pending', 'in-progress'] }
  }).select('startTime endTime');

  for (let time = workStart; time <= workEnd - duration; time += 30) {
    const startHour = Math.floor(time / 60);
    const startMin = time % 60;
    const endTime = time + duration;
    const endHour = Math.floor(endTime / 60);
    const endMin = endTime % 60;

    const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const isAvailable = await this.checkAvailability(date, startTimeStr, endTimeStr);
    
    if (isAvailable) {
      slots.push({
        startTime: startTimeStr,
        endTime: endTimeStr,
        duration: duration
      });
    }
  }

  return slots;
};

// Get booking statistics
bookingSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: {
          $sum: {
            $cond: [
              { $in: ['$status', ['confirmed', 'completed']] },
              '$pricing.totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0
  };
};

// ===============================
// MIDDLEWARES - INCHANGÉS
// ===============================

// Middleware pre-save pour validation
bookingSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      return next(new Error('The end time must be after the start time'));
    }
  }

  if (this.bookingDate && this.isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (this.bookingDate <= today) {
      return next(new Error('The reservation date must be in the future'));
    }
  }

  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.lastModifiedBy || this.createdBy,
      reason: 'Status change'
    });
  }

  next();
});

// Middleware pre-remove
bookingSchema.pre('remove', function(next) {
  this.status = 'cancelled';
  this.cancellation = {
    reason: 'Réservation supprimée',
    cancelledAt: new Date()
  };
  next();
});

// ===============================
// INDEX FOR PERFORMANCES - INCHANGÉS + STRIPE
// ===============================
bookingSchema.index({ client: 1, bookingDate: -1 });
bookingSchema.index({ service: 1, bookingDate: 1 });
bookingSchema.index({ status: 1, bookingDate: 1 });
bookingSchema.index({ bookingDate: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ createdAt: -1 });

// ✅ INDEX STRIPE MINIMAL
bookingSchema.index({ stripeSessionId: 1 }, { sparse: true });

module.exports = mongoose.model('Booking', bookingSchema);