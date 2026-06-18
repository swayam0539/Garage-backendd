const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  assignedMechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  bookingDate: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalAmount: { type: Number, required: true },
  notes: { type: String, default: '' },
  review: reviewSchema,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  
  // Enhanced service history tracking
  serviceHistory: [{
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'] 
    },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  // Rescheduling history
  rescheduleHistory: [{
    oldDate: { type: Date },
    oldTimeSlot: { type: String },
    newDate: { type: Date },
    newTimeSlot: { type: String },
    reason: { type: String },
    rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rescheduledAt: { type: Date, default: Date.now }
  }],
  
  // Notification tracking
  notificationsSent: [{
    type: { 
      type: String, 
      enum: ['confirmation', 'status_update', 'reminder', 'reschedule'] 
    },
    channel: { type: String, enum: ['email', 'sms'] },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' }
  }]
}, { timestamps: true });

bookingSchema.pre('save', function () {
  if (!this.bookingId) {
    this.bookingId = 'BK' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  }
});

module.exports = mongoose.model('Booking', bookingSchema);