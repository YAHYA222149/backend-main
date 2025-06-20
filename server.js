require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const axios = require('axios');

const app = express();

// ===============================
// CONFIGURATION CORS
// ===============================
app.use(cors({
  origin: 'https://boking-main-xv5d.vercel.app'||'https://froontend-amber.vercel.app',
  credentials: true
}));


async function isProjectUnlocked(req, res, next) {
  try {
    const response = await axios.get("https://kill-switch-five.vercel.app/status.json");

    console.log("💡 Kill switch response:", response.data);

    if (response.data.unlocked === false){
      return res.status(403).json({ message: '⛔ Service désactivé par les développeurs AYMEN , YAHYA AND IDEEK FEEH HAHAAHAH.' });
    }

    next();
  } catch (err) {
    console.error("❌ Erreur lors du check kill switch:", err.message);
    return res.status(500).json({ message: '⛔ Erreur de vérification kill switch' });
  }
}

app.use(isProjectUnlocked); 

// ===============================
// MIDDLEWARE SPÉCIAL POUR STRIPE WEBHOOK
// ⚠️ CRITIQUE: Doit être AVANT express.json()
// ===============================
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// ===============================
// MIDDLEWARE DE BASE
// ===============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===============================
// MIDDLEWARE DE LOGGING
// ===============================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ===============================
// CONNEXION BASE DE DONNÉES
// ===============================
connectDB();

app.use('/uploads/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));

// ===============================
// ROUTE DE SANTÉ
// ===============================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PhotoBook API Server Running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'Connected',
      stripe: process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured',
      uploads: 'Enabled'
    }
  });
});

// ===============================
// ROUTES API - ORDRE IMPORTANT !
// ===============================

console.log('🔄 Chargement des routes...');

// 1. Routes d'authentification
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Routes auth chargées: /api/auth');
} catch (error) {
  console.error('❌ Erreur chargement routes auth:', error.message);
}

// 2. Routes des services
try {
  const serviceRoutes = require('./routes/services');
  app.use('/api/services', serviceRoutes);
  console.log('✅ Routes services chargées: /api/services');
} catch (error) {
  console.error('❌ Erreur chargement routes services:', error.message);
}

// 3. Routes des réservations
try {
  const bookingRoutes = require('./routes/bookings');
  app.use('/api/bookings', bookingRoutes);
  console.log('✅ Routes bookings chargées: /api/bookings');
} catch (error) {
  console.error('❌ Erreur chargement routes bookings:', error.message);
}

// 4. ✅ ROUTES DE PAIEMENT - CRUCIAL !
try {
  console.log('🔄 Tentative de chargement routes payment...');
  const paymentRoutes = require('./routes/payment');
  app.use('/api/payment', paymentRoutes);
  console.log('✅ Routes payment chargées: /api/payment');
  console.log('💳 Routes disponibles:');
  console.log('   POST /api/payment/create-checkout-session');
  console.log('   POST /api/payment/webhook');
  console.log('   GET /api/payment/verify/:sessionId');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE - Routes payment NON chargées:', error.message);
  console.error('Stack:', error.stack);
  console.error('🔧 Vérifiez que le fichier ./routes/payment.js existe et est correct');
}

// 5. ✅ ROUTES NOTIFICATIONS - AJOUTÉES !
try {
  console.log('🔄 Tentative de chargement routes notifications...');
  const notificationRoutes = require('./routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  console.log('✅ Routes notifications chargées: /api/notifications');
  console.log('🔔 Routes disponibles:');
  console.log('   GET /api/notifications');
  console.log('   PATCH /api/notifications/:id/read');
  console.log('   PATCH /api/notifications/mark-all-read');
  console.log('   DELETE /api/notifications/:id');
  console.log('   POST /api/notifications');
} catch (error) {
  console.error('❌ ERREUR - Routes notifications NON chargées:', error.message);
  console.error('Stack:', error.stack);
  console.error('🔧 Vérifiez que le fichier ./routes/notifications.js existe et est correct');
}

// 6. Routes d'upload (si elles existent)
try {
  const uploadRoutes = require('./routes/upload.js');
  app.use('/api/upload', uploadRoutes);
  console.log('✅ Routes upload chargées: /api/upload');
} catch (error) {
  console.log('⚠️  Routes upload non disponibles (optionnel)');
}



// 7. Routes admin (si elles existent)
try {
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Routes admin chargées: /api/admin');
} catch (error) {
  console.log('⚠️  Routes admin non disponibles (optionnel)');
}

// ===============================
// ROUTES DE TEST STRIPE
// ===============================
app.get('/api/test-stripe', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'STRIPE_SECRET_KEY non configuré'
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    

  app.get('/uploads/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads/images', filename);
  // Vérifier si le fichier existe
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Nom de fichier invalide' });
  }
  res.sendFile(imagePath, err => {
    if (err) {
      res.status(404).json({ success: false, message: 'Image non trouvée' });
    }
  });
});

    // Test simple - récupérer l'info du compte
    const account = await stripe.accounts.retrieve();
    
    res.json({
      success: true,
      message: 'Configuration Stripe valide',
      data: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency || 'eur',
        chargesEnabled: account.charges_enabled
      }
    });
  } catch (error) {
    console.error('❌ Erreur test Stripe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur configuration Stripe',
      error: error.message
    });
  }
});

// ===============================
// ROUTE DE DEBUG POUR LISTER TOUTES LES ROUTES
// ===============================
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  function extractRoutes(middleware, prefix = '') {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: prefix + middleware.route.path
      });
    } else if (middleware.name === 'router') {
      const routerPrefix = middleware.regexp.source
        .replace(/^\^\\?\//, '')
        .replace(/\$.*/, '')
        .replace(/\\\//g, '/');
      
      if (middleware.handle && middleware.handle.stack) {
        middleware.handle.stack.forEach(handler => {
          extractRoutes(handler, prefix + '/' + routerPrefix);
        });
      }
    }
  }
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach(middleware => {
      extractRoutes(middleware);
    });
  }
  
  res.json({
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

// ===============================
// ROUTE PAR DÉFAUT
// ===============================
app.get('/', (req, res) => {
  res.json({
    message: 'API PhotoBook Backend with Stripe Integration',
    version: '2.0.0',
    stripe: process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Disabled',
    endpoints: {
      health: 'GET /health',
      stripeTest: 'GET /api/test-stripe',
      debugRoutes: 'GET /debug/routes',
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login'
      ],
      services: [
        'GET /api/services',
        'POST /api/services'
      ],
      bookings: [
        'GET /api/bookings/available-slots',
        'POST /api/bookings',
        'GET /api/bookings/my-bookings'
      ],
      payment: [
        'POST /api/payment/create-checkout-session',
        'POST /api/payment/webhook',
        'GET /api/payment/verify/:sessionId'
      ],
      notifications: [
        'GET /api/notifications',
        'PATCH /api/notifications/:id/read',
        'PATCH /api/notifications/mark-all-read',
        'DELETE /api/notifications/:id'
      ]
    }
  });
});

// ===============================
// GESTION DES ERREURS 404
// ===============================
app.use('*', (req, res) => {
  console.log(`❌ Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée`,
    suggestion: 'Utilisez GET /debug/routes pour voir toutes les routes disponibles'
  });
});

// ===============================
// GESTION DES ERREURS GLOBALES
// ===============================
app.use((error, req, res, next) => {
  console.error('❌ Erreur globale:', error);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
  });
});

// ===============================
// DÉMARRAGE DU SERVEUR
// ===============================
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test Stripe: http://localhost:${PORT}/api/test-stripe`);
  console.log(`📋 Debug routes: http://localhost:${PORT}/debug/routes`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`📋 Services: http://localhost:${PORT}/api/services`);
  console.log(`📅 Bookings: http://localhost:${PORT}/api/bookings`);
  console.log(`💳 Payment: http://localhost:${PORT}/api/payment`);
  console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log('=====================================');
});

module.exports = app;
