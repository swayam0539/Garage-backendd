const express = require('express');
const router = express.Router();
const { 
  getAllMechanics, 
  getMechanicBookings, 
  updateAvailability, 
  getMechanicPerformance,
  getAllMechanicsPerformance 
} = require('../controllers/mechanicController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getAllMechanics);
router.get('/performance', protect, adminOnly, getAllMechanicsPerformance);
router.get('/:mechanicId', protect, adminOnly, getMechanicBookings);
router.get('/:mechanicId/performance', protect, adminOnly, getMechanicPerformance);
router.put('/:mechanicId/availability', protect, adminOnly, updateAvailability);

module.exports = router;
