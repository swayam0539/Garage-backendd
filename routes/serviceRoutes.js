const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');

// You'll fill these in from serviceController
const Service = require('../models/Service');

router.get('/', async (req, res) => {
  const services = await Service.find({ isActive: true });
  res.json(services);
});

router.post('/', protect, adminOnly, async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json(service);
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(service);
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  await Service.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Service deactivated' });
});

module.exports = router;