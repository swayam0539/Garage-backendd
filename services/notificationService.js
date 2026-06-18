const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

class NotificationService {
  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(booking) {
    try {
      const customer = booking.customer;
      
      if (!customer.notificationPreferences?.email) {
        return { success: false, reason: 'Email notifications disabled' };
      }

      const emailContent = this.generateConfirmationEmail(booking);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'garage@example.com',
        to: customer.email,
        subject: `Booking Confirmation - ${booking.bookingId}`,
        html: emailContent
      };

      const notification = await Notification.create({
        recipient: customer._id,
        booking: booking._id,
        type: 'confirmation',
        channel: 'email',
        status: 'pending'
      });

      const info = await transporter.sendMail(mailOptions);
      
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.emailDetails = {
        to: customer.email,
        subject: mailOptions.subject,
        messageId: info.messageId
      };
      await notification.save();

      return { success: true, messageId: info.messageId, notificationId: notification._id };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(booking, oldStatus) {
    try {
      const customer = booking.customer;
      
      if (!customer.notificationPreferences?.email) {
        return { success: false, reason: 'Email notifications disabled' };
      }

      const emailContent = this.generateStatusUpdateEmail(booking, oldStatus);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'garage@example.com',
        to: customer.email,
        subject: `Booking Status Update - ${booking.bookingId}`,
        html: emailContent
      };

      const notification = await Notification.create({
        recipient: customer._id,
        booking: booking._id,
        type: 'status_update',
        channel: 'email',
        status: 'pending'
      });

      const info = await transporter.sendMail(mailOptions);
      
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.emailDetails = {
        to: customer.email,
        subject: mailOptions.subject,
        messageId: info.messageId
      };
      await notification.save();

      return { success: true, messageId: info.messageId, notificationId: notification._id };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send reminder notification (24h before appointment)
   */
  async sendReminder(booking) {
    try {
      const customer = booking.customer;
      
      if (!customer.notificationPreferences?.email || !customer.notificationPreferences?.reminders) {
        return { success: false, reason: 'Reminders disabled' };
      }

      const emailContent = this.generateReminderEmail(booking);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'garage@example.com',
        to: customer.email,
        subject: `Booking Reminder - Tomorrow at ${booking.timeSlot}`,
        html: emailContent
      };

      const notification = await Notification.create({
        recipient: customer._id,
        booking: booking._id,
        type: 'reminder',
        channel: 'email',
        status: 'pending'
      });

      const info = await transporter.sendMail(mailOptions);
      
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.emailDetails = {
        to: customer.email,
        subject: mailOptions.subject,
        messageId: info.messageId
      };
      await notification.save();

      return { success: true, messageId: info.messageId, notificationId: notification._id };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send rescheduling confirmation
   */
  async sendRescheduleConfirmation(booking, oldDate) {
    try {
      const customer = booking.customer;
      
      if (!customer.notificationPreferences?.email) {
        return { success: false, reason: 'Email notifications disabled' };
      }

      const emailContent = this.generateRescheduleEmail(booking, oldDate);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'garage@example.com',
        to: customer.email,
        subject: `Booking Rescheduled - ${booking.bookingId}`,
        html: emailContent
      };

      const notification = await Notification.create({
        recipient: customer._id,
        booking: booking._id,
        type: 'reschedule',
        channel: 'email',
        status: 'pending'
      });

      const info = await transporter.sendMail(mailOptions);
      
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.emailDetails = {
        to: customer.email,
        subject: mailOptions.subject,
        messageId: info.messageId
      };
      await notification.save();

      return { success: true, messageId: info.messageId, notificationId: notification._id };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // Email template generators
  generateConfirmationEmail(booking) {
    const services = booking.services.map(s => s.name).join(', ');
    const date = new Date(booking.bookingDate).toLocaleDateString();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Confirmation</h2>
        <p>Hello ${booking.customer.name},</p>
        <p>Your booking has been confirmed!</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${booking.timeSlot}</p>
          <p><strong>Services:</strong> ${services}</p>
          <p><strong>Total Amount:</strong> $${booking.totalAmount}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
        </div>
        
        <p>We look forward to serving you!</p>
        <p style="color: #6b7280; font-size: 14px;">Smart Garage Booking System</p>
      </div>
    `;
  }

  generateStatusUpdateEmail(booking, oldStatus) {
    const date = new Date(booking.bookingDate).toLocaleDateString();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Status Update</h2>
        <p>Hello ${booking.customer.name},</p>
        <p>Your booking status has been updated.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Previous Status:</strong> ${oldStatus}</p>
          <p><strong>Current Status:</strong> ${booking.status}</p>
          ${booking.assignedMechanic ? `<p><strong>Assigned Mechanic:</strong> ${booking.assignedMechanic.name}</p>` : ''}
        </div>
        
        <p>Thank you for choosing our service!</p>
        <p style="color: #6b7280; font-size: 14px;">Smart Garage Booking System</p>
      </div>
    `;
  }

  generateReminderEmail(booking) {
    const date = new Date(booking.bookingDate).toLocaleDateString();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Booking Reminder</h2>
        <p>Hello ${booking.customer.name},</p>
        <p>This is a reminder about your upcoming appointment tomorrow.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${booking.timeSlot}</p>
        </div>
        
        <p>Please arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.</p>
        <p style="color: #6b7280; font-size: 14px;">Smart Garage Booking System</p>
      </div>
    `;
  }

  generateRescheduleEmail(booking, oldDate) {
    const newDate = new Date(booking.bookingDate).toLocaleDateString();
    const oldDateStr = new Date(oldDate).toLocaleDateString();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Rescheduled</h2>
        <p>Hello ${booking.customer.name},</p>
        <p>Your booking has been successfully rescheduled.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Previous Date:</strong> ${oldDateStr}</p>
          <p><strong>New Date:</strong> ${newDate}</p>
          <p><strong>New Time:</strong> ${booking.timeSlot}</p>
        </div>
        
        <p>We look forward to seeing you on the new date!</p>
        <p style="color: #6b7280; font-size: 14px;">Smart Garage Booking System</p>
      </div>
    `;
  }
}

module.exports = new NotificationService();
