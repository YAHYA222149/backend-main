const nodemailer = require('nodemailer');
// Email Carrier Configuration
const createTransporter = () => {
  return nodemailer.createTransport({ // 
    // 
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER1, // 
      pass: process.env.EMAIL_PASS1  // 
    }
  });
};

// Templates d'emails BEAUX et RESPONSIVES
const emailTemplates = {
  bookingConfirmation: (booking, user) => ({
    subject: `✅ Confirmation of your reservation - ${booking.service?.name}`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RReservation Confirmed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              ✅ RReservation Confirmed!
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
             Your photoshoot is now confirmed
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 30px; line-height: 1.6;">
              Hello <strong>${user.firstName} ${user.lastName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.6;">
              Excellent news! Your reservation has been successfully confirmed. We look forward to meeting you for this photoshoot.
            </p>
            
            <!-- Booking Details Card -->
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border: 1px solid #dee2e6;">
              <h3 style="color: #495057; margin: 0 0 20px 0; font-size: 20px;">
                📋 Your Booking Details
              </h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057; display: inline-block; width: 120px;">Service :</span>
                  <span style="color: #333; font-size: 16px;">${booking.service?.name}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057; display: inline-block; width: 120px;">📅 Date :</span>
                  <span style="color: #333; font-size: 16px;">${new Date(booking.bookingDate).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057; display: inline-block; width: 120px;">⏰ Heure :</span>
                  <span style="color: #333; font-size: 16px;">${booking.startTime} - ${booking.endTime}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057; display: inline-block; width: 120px;">📍 Lieu :</span>
                  <span style="color: #333; font-size: 16px;">${booking.location?.type === 'studio' ? 'Studio PhotoBooking' : booking.location?.address?.city || 'À définir'}</span>
                </div>
                ${booking.photographer?.name ? `
                <div style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057; display: inline-block; width: 120px;">📸 Photographe :</span>
                  <span style="color: #333; font-size: 16px;">${booking.photographer.name}</span>
                </div>
                ` : ''}
                <div style="padding: 12px 0;">
                  <span style="font-weight: 600; color: #495057; display: inline-block; width: 120px;">💰 Prix :</span>
                  <span style="color: #28a745; font-size: 18px; font-weight: 700;">${booking.pricing?.totalAmount || booking.totalAmount || 0} €</span>
                </div>
              </div>
            </div>
            
            ${booking.clientNotes ? `
            <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <h4 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">📝 Vos notes</h4>
              <p style="color: #1976d2; margin: 0; font-style: italic;">"${booking.clientNotes}"</p>
            </div>
            ` : ''}
            
            <!-- Important Info -->
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">
                ⚠️ Informations importantes
              </h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Please arrive <strong>15 minutes before</strong> your scheduled time.</li>
<li>If you cannot make it, please let us know <strong>at least 24 hours in advance.</strong></li>
<li>You can bring multiple outfits if desired.</li>
<li>Please do not hesitate to contact us with any questions.</li>
              </ul>
            </div>
            
            <!-- Action Buttons -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                📋 View my reservations
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              Thank you for your trust! 📸
            </p>
            <p style="color: #888; margin: 0; font-size: 14px;">
              The PhotoBooking Team<br>
              <a href="mailto:${process.env.EMAIL_USER1}" style="color: #007bff; text-decoration: none;">Contact us</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  bookingCancellation: (booking, user, reason) => ({
    subject: `❌ Cancellation of your reservation - ${booking.service?.name}`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              ❌ Reservation Cancelled
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              We inform you of the cancellation of your reservation
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 30px; line-height: 1.6;">
              Hello <strong>${user.firstName} ${user.lastName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.6;">
              We inform you that your reservation has been cancelled. We apologize for any inconvenience caused.
            </p>
            
            <!-- Cancelled Booking Details -->
            <div style="background: linear-gradient(135deg, #f8d7da 0%, #f1aeb5 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin: 0 0 20px 0; font-size: 20px;">
                📋 Reservation Cancelled
              </h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(114,28,36,0.2);">
                  <span style="font-weight: 600; color: #721c24; display: inline-block; width: 120px;">Service :</span>
                  <span style="color: #721c24; font-size: 16px;">${booking.service?.name}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(114,28,36,0.2);">
                  <span style="font-weight: 600; color: #721c24; display: inline-block; width: 120px;">📅 Date :</span>
                  <span style="color: #721c24; font-size: 16px;">${new Date(booking.bookingDate).toLocaleDateString('fr-FR')}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(114,28,36,0.2);">
                  <span style="font-weight: 600; color: #721c24; display: inline-block; width: 120px;">⏰ Heure :</span>
                  <span style="color: #721c24; font-size: 16px;">${booking.startTime} - ${booking.endTime}</span>
                </div>
                ${reason ? `
                <div style="padding: 12px 0;">
                  <span style="font-weight: 600; color: #721c24; display: inline-block; width: 120px;">📝 Raison :</span>
                  <span style="color: #721c24; font-size: 16px; font-style: italic;">${reason}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Next Steps -->
            <div style="background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%); border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #17a2b8;">
              <h4 style="color: #0c5460; margin: 0 0 15px 0; font-size: 18px;">
                💡 Prochaines étapes
              </h4>
              <ul style="color: #0c5460; margin: 0; padding-left: 20px; line-height: 1.8;">
               <li>You can make a <strong>new reservation</strong> at any time</li>
<li>Check out our <strong>other services</strong> available</li>
<li>Contact us for any <strong>questions or assistance</strong></li>
              </ul>
            </div>
            
            <!-- Action Buttons -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/services" 
                 style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                🎨 View our services
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              We hope to see you again soon! 📸
            </p>
            <p style="color: #888; margin: 0; font-size: 14px;">
              The PhotoBooking Team<br>
              <a href="mailto:${process.env.EMAIL_USER1}" style="color: #007bff; text-decoration: none;">Contact us</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  bookingReminder: (booking, user) => ({
    subject: `⏰ Reminder - Your session ${booking.service?.name} tomorrow`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rappel de Séance</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              ⏰ Session Reminder
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Your photoshoot is tomorrow!
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 30px; line-height: 1.6;">
              Hello <strong>${user.firstName} ${user.lastName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.6;">
              Tomorrow is the big day! We remind you that your photoshoot is scheduled for <strong>tomorrow</strong>. We look forward to meeting you!
            </p>
            
            <!-- Tomorrow's Session -->
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin: 0 0 20px 0; font-size: 20px;">
                📅 Your Session Tomorrow
              </h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(133,100,4,0.2);">
                  <span style="font-weight: 600; color: #856404; display: inline-block; width: 120px;">Service :</span>
                  <span style="color: #856404; font-size: 16px;">${booking.service?.name}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(133,100,4,0.2);">
                  <span style="font-weight: 600; color: #856404; display: inline-block; width: 120px;">📅 Date :</span>
                  <span style="color: #856404; font-size: 16px; font-weight: 700;">${new Date(booking.bookingDate).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(133,100,4,0.2);">
                  <span style="font-weight: 600; color: #856404; display: inline-block; width: 120px;">⏰ Heure :</span>
                  <span style="color: #856404; font-size: 16px; font-weight: 700;">${booking.startTime} - ${booking.endTime}</span>
                </div>
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(133,100,4,0.2);">
                  <span style="font-weight: 600; color: #856404; display: inline-block; width: 120px;">📍 Lieu :</span>
                  <span style="color: #856404; font-size: 16px;">${booking.location?.type === 'studio' ? 'Studio PhotoBooking' : booking.location?.address?.city || 'À définir'}</span>
                </div>
                ${booking.photographer?.name ? `
                <div style="padding: 12px 0;">
                  <span style="font-weight: 600; color: #856404; display: inline-block; width: 120px;">📸 Photographe :</span>
                  <span style="color: #856404; font-size: 16px;">${booking.photographer.name}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Tips for Session -->
            <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #28a745;">
              <h4 style="color: #155724; margin: 0 0 15px 0; font-size: 18px;">
                ✅ Tips for your session
              </h4>
              <ul style="color: #155724; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Arrive 15 minutes early</strong> to prepare</li>
                <li>Bring <strong>different outfits</strong> if you wish</li>
                <li>Come <strong>relaxed</strong> and with a smile</li>
                <li>Feel free to <strong>ask questions</strong> to the photographer</li>
                <li><strong>Enjoy the moment</strong> - it's your session!</li>
              </ul>
            </div>
            
            <!-- Action Buttons -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(40,167,69,0.3);">
                📋 View my reservation
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              See you soon! 📸✨
            </p>
            <p style="color: #888; margin: 0; font-size: 14px;">
              The PhotoBooking Team<br>
              <a href="mailto:${process.env.EMAIL_USER1}" style="color: #007bff; text-decoration: none;">Contact us</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Email sending functions
const sendEmail = async (to, template) => {
  try {
    // Check if emails are enabled
    if (process.env.EMAIL_ENABLED === 'false') {
      console.log('📧 Emails disabled in environment:', process.env.NODE_ENV);
      return { success: true, messageId: 'disabled' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"PhotoBooking 📸" <${process.env.EMAIL_USER1}>`, // ✅ CORRIGÉ
      to: to,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', result.messageId, 'to', to);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Specific functions for each type of email
const sendBookingConfirmationEmail = async (booking, user) => {
  const template = emailTemplates.bookingConfirmation(booking, user);
  return sendEmail(user.email, template);
};

const sendBookingCancellationEmail = async (booking, user, reason) => {
  const template = emailTemplates.bookingCancellation(booking, user, reason);
  return sendEmail(user.email, template);
};

const sendBookingReminderEmail = async (booking, user) => {
  const template = emailTemplates.bookingReminder(booking, user);
  return sendEmail(user.email, template);
};

// ✅ FUNCTION TO SEND AUTOMATIC REMINDERS
const sendDailyReminders = async () => {
  try {
    const Booking = require('../models/Booking');

    // Find confirmed reservations for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);
    
    const bookings = await Booking.find({
      status: 'confirmed',
      bookingDate: {
        $gte: tomorrow,
        $lte: endOfTomorrow
      },
      reminderSent: { $ne: true }
    }).populate('service client');
    
    console.log(`📧 Envoi de ${bookings.length} rappels pour demain...`);
    
    for (const booking of bookings) {
      if (booking.client && booking.client.email) {
        await sendBookingReminderEmail(booking, booking.client);
        
      // Mark the reminder as sent
        booking.reminderSent = true;
        await booking.save();

        // Create a notification
        try {
          const Notification = require('../models/notification');
          await Notification.createBookingReminder(booking.client._id, booking);
        } catch (notifError) {
          console.error('⚠️ Error creating reminder notification:', notifError);
        }
      }
    }

    console.log('✅ Daily reminders sent successfully');
    return { success: true, sentCount: bookings.length };
  } catch (error) {
    console.error('❌ Error sending daily reminders:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
  sendDailyReminders,
  emailTemplates
};