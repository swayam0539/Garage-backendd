const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['maintenance', 'repair', 'cleaning', 'inspection', 'tires', 'electrical'],
    required: true
  },
  basePrice: { type: Number, required: true },
  duration: { type: Number, required: true }, // in minutes
  icon: { type: String, default: '🔧' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);