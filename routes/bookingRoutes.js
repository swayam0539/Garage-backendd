const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getAllBookings, getBookingById,
        updateBookingStatus, cancelBooking, addReview, rescheduleBooking, getAnalytics } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/',              protect, createBooking);
router.get('/my',             protect, getMyBookings);
router.get('/analytics',      protect, adminOnly, getAnalytics);
router.get('/',               protect, adminOnly, getAllBookings);
router.get('/:id',            protect, getBookingById);
router.put('/:id/status',     protect, updateBookingStatus);
router.put('/:id/cancel',     protect, cancelBooking);
router.put('/:id/reschedule', protect, rescheduleBooking);
router.post('/:id/review',    protect, addReview);

module.exports = router;