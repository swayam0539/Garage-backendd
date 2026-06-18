const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "10:00"
  isAvailable: { type: Boolean, default: true },
  maxCapacity: { type: Number, default: 3 },
  currentBookings: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Slot', slotSchema);