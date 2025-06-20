const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'booking_confirmed',
      'booking_cancelled', 
      'booking_reminder',
      'booking_updated',
      'admin_message',
      'payment_received',
      'system_notification'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    // Données additionnelles liées à la notification
    bookingId: mongoose.Schema.Types.ObjectId,
    serviceId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    url: String,
    actionRequired: Boolean
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    // Les notifications expirent après 30 jours
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Méthodes statiques pour créer des notifications spécifiques
notificationSchema.statics.createBookingConfirmation = async function(userId, booking) {
  return this.create({
    user: userId,
    type: 'booking_confirmed',
    title: '✅ Réservation confirmée',
    message: `Votre réservation pour ${booking.service?.name} le ${new Date(booking.bookingDate).toLocaleDateString('fr-FR')} a été confirmée !`,
    data: {
      bookingId: booking._id,
      serviceId: booking.service._id
    }
  });
};

notificationSchema.statics.createBookingCancellation = async function(userId, booking, reason) {
  return this.create({
    user: userId,
    type: 'booking_cancelled',
    title: '❌ Réservation annulée',
    message: `Votre réservation pour ${booking.service?.name} a été annulée. Raison: ${reason}`,
    data: {
      bookingId: booking._id,
      serviceId: booking.service._id
    }
  });
};

notificationSchema.statics.createBookingReminder = async function(userId, booking) {
  return this.create({
    user: userId,
    type: 'booking_reminder',
    title: '⏰ Rappel de réservation',
    message: `N'oubliez pas votre séance ${booking.service?.name} demain à ${booking.startTime} !`,
    data: {
      bookingId: booking._id,
      serviceId: booking.service._id,
      actionRequired: false
    }
  });
};

notificationSchema.statics.createAdminMessage = async function(userId, title, message) {
  return this.create({
    user: userId,
    type: 'admin_message',
    title: `📢 ${title}`,
    message: message,
    data: {
      actionRequired: false
    }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);