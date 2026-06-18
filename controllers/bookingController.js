const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Service = require('../models/Service');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// Create booking
const createBooking = async (req, res) => {
  try {
    const { vehicleId, serviceIds, slotId, bookingDate, timeSlot, notes } = req.body;

    const slot = await Slot.findById(slotId);
    if (!slot || !slot.isAvailable || slot.currentBookings >= slot.maxCapacity) {
      return res.status(400).json({ message: 'Slot not available' });
    }

    const services = await Service.find({ _id: { $in: serviceIds } });
    const totalAmount = services.reduce((sum, s) => sum + s.basePrice, 0);

    const booking = await Booking.create({
      customer: req.user._id,
      vehicle: vehicleId,
      services: serviceIds,
      slot: slotId,
      bookingDate,
      timeSlot,
      totalAmount,
      notes,
      serviceHistory: [{ status: 'pending', note: 'Booking created', updatedBy: req.user._id }]
    });

    slot.currentBookings += 1;
    if (slot.currentBookings >= slot.maxCapacity) slot.isAvailable = false;
    await slot.save();

    const populated = await Booking.findById(booking._id)
      .populate('vehicle').populate('services').populate('customer', 'name email phone notificationPreferences');

    // Send confirmation notification (non-blocking, won't fail booking)
    notificationService.sendBookingConfirmation(populated).catch(() => {});

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user bookings
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('vehicle').populate('services').populate('assignedMechanic', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all bookings (admin)
const getAllBookings = async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      query.bookingDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('vehicle').populate('services')
      .populate('assignedMechanic', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Booking.countDocuments(query);
    res.json({ bookings, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single booking
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('vehicle').populate('services')
      .populate('assignedMechanic', 'name email')
      .populate('serviceHistory.updatedBy', 'name');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { status, note, mechanicId } = req.body;
    const booking = await Booking.findById(req.params.id).populate('customer', 'name email phone notificationPreferences');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const oldStatus = booking.status;
    booking.status = status;
    
    // Handle mechanic assignment with workload update
    if (mechanicId) {
      const mechanic = await User.findById(mechanicId);
      if (!mechanic || mechanic.role !== 'mechanic') {
        return res.status(400).json({ message: 'Invalid mechanic' });
      }
      
      // Update previous mechanic workload if changed
      if (booking.assignedMechanic && booking.assignedMechanic.toString() !== mechanicId) {
        await User.findByIdAndUpdate(booking.assignedMechanic, {
          $inc: { 'mechanicDetails.currentWorkload': -1 }
        });
      }
      
      booking.assignedMechanic = mechanicId;
      
      // Increment new mechanic workload
      await User.findByIdAndUpdate(mechanicId, {
        $inc: { 'mechanicDetails.currentWorkload': 1 }
      });
    }
    
    booking.serviceHistory.push({ status, note: note || `Status updated to ${status}`, updatedBy: req.user._id });

    if (status === 'completed') {
      booking.paymentStatus = 'paid';
      // Update mechanic job completion count
      if (booking.assignedMechanic) {
        await User.findByIdAndUpdate(booking.assignedMechanic, {
          $inc: { 
            'mechanicDetails.totalJobsCompleted': 1,
            'mechanicDetails.currentWorkload': -1
          }
        });
      }
    }
    
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('vehicle').populate('services')
      .populate('assignedMechanic', 'name email');

    // Send status update notification
    try {
      await notificationService.sendStatusUpdate(updated, oldStatus);
    } catch (emailErr) {
      console.error('Failed to send status update email:', emailErr);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }
    booking.status = 'cancelled';
    booking.serviceHistory.push({ status: 'cancelled', note: 'Cancelled by user', updatedBy: req.user._id });

    const slot = await Slot.findById(booking.slot);
    if (slot) {
      slot.currentBookings = Math.max(0, slot.currentBookings - 1);
      slot.isAvailable = true;
      await slot.save();
    }
    await booking.save();
    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add review
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    }
    if (booking.status !== 'completed') return res.status(400).json({ message: 'Can only review completed bookings' });
    if (booking.review && booking.review.rating) {
      return res.status(400).json({ message: 'Booking already reviewed' });
    }
    
    booking.review = { rating, comment };
    await booking.save();
    
    // Update mechanic average rating if assigned
    if (booking.assignedMechanic) {
      const completedBookings = await Booking.find({
        assignedMechanic: booking.assignedMechanic,
        status: 'completed',
        'review.rating': { $exists: true, $ne: null }
      });
      
      const totalRating = completedBookings.reduce((sum, b) => sum + (b.review?.rating || 0), 0);
      const avgRating = completedBookings.length > 0 ? totalRating / completedBookings.length : 0;
      
      await User.findByIdAndUpdate(booking.assignedMechanic, {
        'mechanicDetails.averageRating': avgRating
      });
    }
    
    res.json({ message: 'Review added', review: booking.review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reschedule booking
const rescheduleBooking = async (req, res) => {
  try {
    const { newSlotId, newBookingDate, newTimeSlot, reason } = req.body;
    
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone notificationPreferences')
      .populate('slot');
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Authorization check
    if (booking.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Status validation
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot reschedule booking with status: ' + booking.status });
    }
    
    // Time validation - at least 48 hours before appointment
    const timeDiff = new Date(booking.bookingDate) - new Date();
    if (timeDiff < 48 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Cannot reschedule within 48 hours of appointment' });
    }
    
    // Reschedule limit check
    if (booking.rescheduleHistory && booking.rescheduleHistory.length >= 3) {
      return res.status(400).json({ message: 'Maximum reschedule limit (3) reached' });
    }
    
    // Validate new slot
    const newSlot = await Slot.findById(newSlotId);
    if (!newSlot || !newSlot.isAvailable || newSlot.currentBookings >= newSlot.maxCapacity) {
      return res.status(400).json({ message: 'New slot not available' });
    }
    
    // Save old details
    const oldDate = booking.bookingDate;
    const oldTimeSlot = booking.timeSlot;
    const oldSlot = booking.slot;
    
    // Release old slot
    if (oldSlot) {
      oldSlot.currentBookings = Math.max(0, oldSlot.currentBookings - 1);
      oldSlot.isAvailable = true;
      await oldSlot.save();
    }
    
    // Book new slot
    newSlot.currentBookings += 1;
    if (newSlot.currentBookings >= newSlot.maxCapacity) {
      newSlot.isAvailable = false;
    }
    await newSlot.save();
    
    // Update booking
    booking.slot = newSlotId;
    booking.bookingDate = newBookingDate;
    booking.timeSlot = newTimeSlot;
    
    booking.rescheduleHistory = booking.rescheduleHistory || [];
    booking.rescheduleHistory.push({
      oldDate,
      oldTimeSlot,
      newDate: newBookingDate,
      newTimeSlot,
      reason: reason || 'Rescheduled by user',
      rescheduledBy: req.user._id,
      rescheduledAt: new Date()
    });
    
    booking.serviceHistory.push({
      status: booking.status,
      note: `Rescheduled from ${new Date(oldDate).toDateString()} to ${new Date(newBookingDate).toDateString()}`,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });
    
    await booking.save();
    
    const updated = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('vehicle').populate('services')
      .populate('assignedMechanic', 'name email');
    
    // Send reschedule notification
    try {
      await notificationService.sendRescheduleConfirmation(updated, oldDate);
    } catch (emailErr) {
      console.error('Failed to send reschedule email:', emailErr);
    }
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Analytics
const getAnalytics = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    const inProgressBookings = await Booking.countDocuments({ status: 'in-progress' });

    const revenueResult = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const monthlyRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$totalAmount' }, count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    const popularServices = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$services' },
      { $group: { _id: '$services', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $project: { name: '$service.name', count: 1 } }
    ]);

    res.json({
      totalBookings, pendingBookings, confirmedBookings, completedBookings,
      cancelledBookings, inProgressBookings, totalRevenue,
      monthlyRevenue, popularServices
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  createBooking, 
  getMyBookings, 
  getAllBookings, 
  getBookingById, 
  updateBookingStatus, 
  cancelBooking, 
  addReview, 
  rescheduleBooking,
  getAnalytics 
};