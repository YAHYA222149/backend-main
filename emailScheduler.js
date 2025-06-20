const cron = require('node-cron');
const { sendDailyReminders } = require('./utils/emailService');

// ✅ Function to start the email scheduler
const startEmailScheduler = () => {
  console.log('📧 Démarrage du planificateur d\'emails...');
  
  // ✅ DAILY REMINDERS - Every day at 6:00 p.m.
  cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Executing daily reminders at 6:00 p.m....');
    try {
      const result = await sendDailyReminders();
      if (result.success) {
        console.log(`✅ ${result.sentCount} reminders sent successfully`);
      } else {
        console.error('❌ Error during reminders:', result.error);
      }
    } catch (error) {
      console.error('❌ Error during daily reminders:', error);
    }
  }, {
    timezone: "Europe/Paris"
  });

// ✅ PENDING RESERVATIONS VERIFICATION - Every day at 10:00 a.m.
  cron.schedule('0 10 * * *', async () => {
    console.log('⏰ Pending reservations verification at 10:00 a.m....');
    try {
      await sendPendingBookingReminders();
    } catch (error) {
      console.error('❌ Error during pending reservations verification:', error);
    }
  }, {
    timezone: "Europe/Paris"
  });

  console.log('✅ Email scheduler started successfully');
  console.log('📅 Daily reminders: every day at 18:00 (Europe/Paris)');
  console.log('📋 Pending reservations verification: every day at 10:00 (Europe/Paris)');
};

// ✅ Function to remind reservations pending for more than 2 days
const sendPendingBookingReminders = async () => {
  try {
    const Booking = require('./models/Booking');
    const Notification = require('./models/Notification');
    
   // Find reservations pending for more than 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const pendingBookings = await Booking.find({
      status: 'pending',
      createdAt: { $lte: twoDaysAgo },
      pendingReminderSent: { $ne: true }
    }).populate('service client');
    
    console.log(`📋 ${pendingBookings.length} reservations pending found`);
    
    for (const booking of pendingBookings) {
      if (booking.client) {
        const daysPending = Math.floor((Date.now() - booking.createdAt) / (1000 * 60 * 60 * 24));
        
        // Create a notification for the client
        await Notification.createAdminMessage(
          booking.client._id,
          'Reservation pending',
          `Your reservation for ${booking.service?.name} has been pending confirmation for ${daysPending} days. We are processing your request as soon as possible.`
        );

        // Mark as reminder sent
        booking.pendingReminderSent = true;
        await booking.save();
      }
    }
    
    console.log('✅ Rappels réservations en attente envoyés');
    return { success: true, count: pendingBookings.length };
  } catch (error) {
    console.error('❌ Erreur rappels réservations en attente:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Fonction utilitaire pour tester l'envoi d'emails - CORRIGÉE POUR EMAIL_USER1
const testEmailConfiguration = async () => {
  try {
    const { sendEmail } = require('./utils/emailService');
    
    const testTemplate = {
      subject: '🧪 Email configuration test - PhotoBooking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #007bff 0%, #28a745 100%); color: white; border-radius: 10px;">
          <h1 style="text-align: center; margin-bottom: 20px;">✅ Configuration Email OK !</h1>
          <p style="font-size: 16px; line-height: 1.6;">Ce message de test confirme que votre configuration email fonctionne correctement.</p>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <p><strong>Environnement:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Email User:</strong> ${process.env.EMAIL_USER1}</p>
            <p><strong>Email Pass:</strong> ${process.env.EMAIL_PASS1 ? '✅ Configuré' : '❌ Manquant'}</p>
          </div>
          <hr style="border: 1px solid rgba(255,255,255,0.3); margin: 20px 0;">
          <p style="text-align: center; font-size: 14px; opacity: 0.8;">PhotoBooking System - Test automatique</p>
        </div>
      `
    };
    const result = await sendEmail(process.env.EMAIL_USER1, testTemplate);
    
    if (result.success) {
      console.log('✅ Test email sent successfully to', process.env.EMAIL_USER1);
      return true;
    } else {
      console.error('❌ Test email sending failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error during test email:', error);
    return false;
  }
};

// ✅ Function to test reminders manually
const testReminders = async () => {
  console.log('🧪 Test reminders manually...');
  const result = await sendDailyReminders();
  console.log('Test reminders result:', result);
  return result;
};

module.exports = {
  startEmailScheduler,
  sendPendingBookingReminders,
  testEmailConfiguration,
  testReminders
};