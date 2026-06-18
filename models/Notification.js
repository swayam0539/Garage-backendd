const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true 
  },
  type: {
    type: String,
    enum: ['confirmation', 'status_update', 'reminder', 'reschedule'],
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'both'],
    default: 'email'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending'
  },
  emailDetails: {
    to: { type: String },
    subject: { type: String },
    messageId: { type: String },
    error: { type: String }
  },
  smsDetails: {
    to: { type: String },
    messageId: { type: String },
    error: { type: String }
  },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ booking: 1 });
notificationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
