const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Slot = require('../models/Slot');

// Get all users
router.get('/users', protect, adminOnly, async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Get all mechanics
router.get('/mechanics', protect, async (req, res) => {
  const mechanics = await User.find({ role: 'mechanic' }).select('-password');
  res.json(mechanics);
});

// Create mechanic
router.post('/mechanics', protect, adminOnly, async (req, res) => {
  const mechanic = await User.create({ ...req.body, role: 'mechanic' });
  res.status(201).json(mechanic);
});

// Bulk-generate slots for next N days (admin utility — non-destructive, skips dates that already have slots)
router.post('/slots/generate', protect, adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const TIME_SLOTS = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '11:00' },
      { startTime: '11:00', endTime: '12:00' },
      { startTime: '13:00', endTime: '14:00' },
      { startTime: '14:00', endTime: '15:00' },
      { startTime: '15:00', endTime: '16:00' },
      { startTime: '16:00', endTime: '17:00' },
    ];
    const today = new Date();
    const toInsert = [];
    for (let d = 0; d < days; d++) {
      const day = new Date(today);
      day.setUTCDate(today.getUTCDate() + d);
      if (day.getUTCDay() === 0) continue; // skip Sunday
      const dateStr = day.toISOString().split('T')[0];
      const utcDate = new Date(dateStr + 'T00:00:00.000Z');
      for (const ts of TIME_SLOTS) {
        const exists = await Slot.findOne({ date: utcDate, startTime: ts.startTime });
        if (!exists) {
          toInsert.push({ date: utcDate, startTime: ts.startTime, endTime: ts.endTime, maxCapacity: 3, currentBookings: 0, isAvailable: true });
        }
      }
    }
    if (toInsert.length > 0) await Slot.insertMany(toInsert);
    res.json({ created: toInsert.length, message: `Generated ${toInsert.length} new slots over ${days} days` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create slot
router.post('/slots', protect, adminOnly, async (req, res) => {
  try {
    const { date, startTime, endTime, maxCapacity } = req.body;
    // Store the date as UTC midnight so the date query ($gte/$lte on UTC boundaries) works correctly
    const utcDate = new Date(date + 'T00:00:00.000Z');
    const slot = await Slot.create({ date: utcDate, startTime, endTime, maxCapacity });
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get slots by date
router.get('/slots', protect, async (req, res) => {
  const { date } = req.query;
  let query = {};
  if (date) {
    // Parse the YYYY-MM-DD string as a local-date range using UTC boundaries
    // to ensure timezone differences don't push the query into the wrong day.
    // We match the full calendar day regardless of the server's local timezone.
    const start = new Date(date + 'T00:00:00.000Z');
    const end   = new Date(date + 'T23:59:59.999Z');
    query = { date: { $gte: start, $lte: end } };
  }
  const slots = await Slot.find(query).sort({ startTime: 1 });
  res.json(slots);
});

module.exports = router;