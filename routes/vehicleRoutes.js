const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Vehicle = require('../models/Vehicle');

router.get('/', protect, async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user._id, isActive: true });
  res.json(vehicles);
});

router.post('/', protect, async (req, res) => {
  const vehicle = await Vehicle.create({ ...req.body, owner: req.user._id });
  res.status(201).json(vehicle);
});

router.put('/:id', protect, async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(vehicle);
});

router.delete('/:id', protect, async (req, res) => {
  await Vehicle.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Vehicle removed' });
});

module.exports = router;