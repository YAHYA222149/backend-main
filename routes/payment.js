const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { authenticate } = require('../middleware/auth');

// ✅ VÉRIFICATION STRIPE SIMPLE
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY non défini - paiements désactivés');
    stripe = null;
  } else {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialisé (mode simple sans webhook)');
  }
} catch (error) {
  console.error('❌ Erreur Stripe:', error.message);
  stripe = null;
}

// ✅ MIDDLEWARE SIMPLE POUR VÉRIFIER STRIPE
const requireStripe = (req, res, next) => {
  if (!stripe) {
    return res.status(500).json({
      success: false,
      message: 'Service de paiement non disponible - STRIPE_SECRET_KEY manquant'
    });
  }
  next();
};

// @route   POST /api/payment/create-checkout-session
// @desc    Créer une session de paiement Stripe (VERSION SIMPLE)
// @access  Private
router.post('/create-checkout-session', authenticate, requireStripe, async (req, res) => {
  try {
    console.log('💳 Création session Stripe simple...');
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'bookingId requis'
      });
    }

    // Récupérer la réservation
    const booking = await Booking.findById(bookingId)
      .populate('service')
      .populate('client');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifications de base
    if (booking.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (booking.pricing.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Déjà payé'
      });
    }

    // ✅ CRÉER SESSION STRIPE MINIMALE
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: booking.service.name,
            description: `Séance photo`,
          },
          unit_amount: Math.round(booking.pricing.totalAmount * 100), // centimes
        },
        quantity: 1,
      }],

      // ✅ MÉTADONNÉES SIMPLES
      metadata: {
        booking_id: booking._id.toString(),
      },

      // ✅ URLs DE REDIRECTION SIMPLES
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/cancel?booking_id=${booking._id}`,
    });

    console.log('✅ Session créée:', session.id);

    // Sauvegarder l'ID de session
    booking.stripeSessionId = session.id;
    await booking.save();

    res.json({
      success: true,
      data: {
        sessionUrl: session.url,
        sessionId: session.id
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur création session',
      error: error.message
    });
  }
});

// @route   GET /api/payment/verify/:sessionId
// @desc    Vérifier le paiement après retour de Stripe (REMPLACE LE WEBHOOK)
// @access  Private
router.get('/verify/:sessionId', authenticate, requireStripe, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('🔍 === VÉRIFICATION PAIEMENT ===');
    console.log('Session ID:', sessionId);
    console.log('User ID:', req.user._id);

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('💳 Stripe session status:', session.payment_status);
    
    // Trouver la réservation
    const booking = await Booking.findOne({ stripeSessionId: sessionId })
      .populate('service')
      .populate('client');

    if (!booking) {
      console.error('❌ Réservation non trouvée avec session:', sessionId);
      
      // Debug: chercher toutes les réservations de cet utilisateur
      const userBookings = await Booking.find({ client: req.user._id });
      console.log('📋 Réservations utilisateur:', userBookings.length);
      
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    console.log('📋 Réservation trouvée:', booking._id);
    console.log('📋 Statut actuel:', booking.status);
    console.log('💰 Paiement actuel:', booking.pricing.paymentStatus);

    // Vérifier autorisation
    if (booking.client._id.toString() !== req.user._id.toString()) {
      console.error('❌ Non autorisé - Client:', booking.client._id, 'User:', req.user._id);
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // ✅ CORRECTION : GARDER LE STATUT 'PENDING' MÊME APRÈS PAIEMENT
    if (session.payment_status === 'paid' && booking.pricing.paymentStatus !== 'paid') {
      console.log('✅ Mise à jour réservation - paiement confirmé MAIS statut reste pending');
      
      // ✅ NE PAS CHANGER LE STATUT - IL RESTE 'pending'
      booking.pricing.paymentStatus = 'paid';
      booking.stripePaymentIntentId = session.payment_intent;
      booking.lastModifiedBy = req.user._id;
      
      // ✅ AJOUTER HISTORIQUE AVEC STATUT 'pending'
      booking.statusHistory.push({
        status: 'pending',
        changedBy: req.user._id,
        reason: 'Paiement confirmé - En attente d\'approbation admin'
      });

      const updatedBooking = await booking.save();
      console.log('✅ Réservation sauvegardée:', updatedBooking._id);
      console.log('✅ Statut (reste pending):', updatedBooking.status);
      console.log('✅ Paiement (maintenant paid):', updatedBooking.pricing.paymentStatus);
    } else {
      console.log('ℹ️ Pas de mise à jour nécessaire');
      console.log('   - Session payment_status:', session.payment_status);
      console.log('   - Booking paymentStatus:', booking.pricing.paymentStatus);
    }

    // Recharger la réservation avec toutes les données
    const finalBooking = await Booking.findById(booking._id)
      .populate('service')
      .populate('client');

    res.json({
      success: true,
      data: {
        paymentStatus: session.payment_status,
        bookingStatus: finalBooking.status,
        booking: {
          id: finalBooking._id,
          serviceName: finalBooking.service.name,
          totalAmount: finalBooking.pricing.totalAmount,
          status: finalBooking.status,
          paymentStatus: finalBooking.pricing.paymentStatus,
          bookingDate: finalBooking.bookingDate,
          startTime: finalBooking.startTime,
          endTime: finalBooking.endTime
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur vérification',
      error: error.message
    });
  }
});

// @route   GET /api/payment/test
// @desc    Route de test simple
// @access  Public
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Routes de paiement fonctionnelles',
    stripe: !!stripe,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;