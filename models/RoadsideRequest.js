const mongoose = require('mongoose');

const roadsideSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle:   { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },

  // Location
  location: {
    address:    { type: String, required: true },
    landmark:   { type: String, default: '' },
    city:       { type: String, default: '' },
    state:      { type: String, default: '' },
    postalCode: { type: String, default: '' },
  },

  // Problem
  issueType: {
    type: String,
    enum: ['flat_tyre', 'battery_dead', 'engine_failure', 'accident', 'fuel_empty', 'overheating', 'other'],
    required: true,
  },
  description: { type: String, default: '' },

  // Urgency
  urgency: {
    type: String,
    enum: ['immediate', 'within_hour', 'scheduled'],
    default: 'immediate',
  },

  // Status lifecycle
  status: {
    type: String,
    enum: ['pending', 'accepted', 'mechanic_dispatched', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },

  assignedMechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  estimatedArrival: { type: String, default: '' },

  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },

  statusHistory: [{
    status:    { type: String },
    note:      { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    updatedAt: { type: Date, default: Date.now },
  }],

  notes: { type: String, default: '' },
}, { timestamps: true });

roadsideSchema.pre('save', function () {
  if (!this.requestId) {
    this.requestId = 'RS' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  }
});

module.exports = mongoose.model('RoadsideRequest', roadsideSchema);
