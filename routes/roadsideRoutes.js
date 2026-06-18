const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const RoadsideRequest = require('../models/RoadsideRequest');
const User = require('../models/User');

// ── USER: Create a roadside request ──────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { vehicleId, location, issueType, description, urgency, notes } = req.body;

    // Validate required fields explicitly for a clear error message
    if (!vehicleId)           return res.status(400).json({ message: 'Vehicle is required' });
    if (!issueType)           return res.status(400).json({ message: 'Issue type is required' });
    if (!location?.address)   return res.status(400).json({ message: 'Location address is required' });

    const request = new RoadsideRequest({
      customer:    req.user._id,
      vehicle:     vehicleId,
      location:    {
        address:    location.address,
        landmark:   location.landmark   || '',
        city:       location.city       || '',
        state:      location.state      || '',
        postalCode: location.postalCode || '',
      },
      issueType,
      description: description || '',
      urgency:     urgency || 'immediate',
      notes:       notes || '',
    });

    await request.save();

    // Add initial status history entry after save so _id exists
    request.statusHistory.push({ status: 'pending', note: 'Request created', updatedBy: req.user._id });
    await request.save();

    const populated = await RoadsideRequest.findById(request._id)
      .populate('vehicle')
      .populate('customer', 'name email phone');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Roadside create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── USER: Get my roadside requests ───────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await RoadsideRequest.find({ customer: req.user._id })
      .populate('vehicle')
      .populate('assignedMechanic', 'name phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── USER: Cancel own request ──────────────────────────────────────────────────
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const req2 = await RoadsideRequest.findById(req.params.id);
    if (!req2) return res.status(404).json({ message: 'Request not found' });
    if (req2.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });
    if (['completed', 'cancelled'].includes(req2.status))
      return res.status(400).json({ message: 'Cannot cancel this request' });
    req2.status = 'cancelled';
    req2.statusHistory.push({ status: 'cancelled', note: 'Cancelled by user', updatedBy: req.user._id });
    await req2.save();
    res.json(req2);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Get all requests ───────────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await RoadsideRequest.find(query)
      .populate('vehicle')
      .populate('customer', 'name email phone')
      .populate('assignedMechanic', 'name phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Update status / assign mechanic ────────────────────────────────────
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, note, mechanicId, estimatedArrival, totalAmount } = req.body;
    const request = await RoadsideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    if (mechanicId)        request.assignedMechanic = mechanicId;
    if (estimatedArrival)  request.estimatedArrival = estimatedArrival;
    if (totalAmount != null) request.totalAmount = totalAmount;
    if (status === 'completed') request.paymentStatus = 'paid';

    request.statusHistory.push({ status, note: note || `Status updated to ${status}`, updatedBy: req.user._id });
    await request.save();

    const updated = await RoadsideRequest.findById(request._id)
      .populate('vehicle')
      .populate('customer', 'name email phone')
      .populate('assignedMechanic', 'name phone');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
