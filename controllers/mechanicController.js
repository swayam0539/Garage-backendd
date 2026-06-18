const User = require('../models/User');
const Booking = require('../models/Booking');

// Get all mechanics with workload
const getAllMechanics = async (req, res) => {
  try {
    const mechanics = await User.find({ role: 'mechanic', isActive: true })
      .select('name email phone mechanicDetails')
      .sort({ 'mechanicDetails.currentWorkload': 1 });
    
    res.json(mechanics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get mechanic's assigned bookings
const getMechanicBookings = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { status } = req.query;
    
    const query = { assignedMechanic: mechanicId };
    if (status) query.status = status;
    
    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('vehicle')
      .populate('services')
      .sort({ bookingDate: 1 });
    
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update mechanic availability
const updateAvailability = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { isAvailable } = req.body;
    
    const mechanic = await User.findOne({ _id: mechanicId, role: 'mechanic' });
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }
    
    mechanic.mechanicDetails.isAvailable = isAvailable;
    await mechanic.save();
    
    res.json({ message: 'Availability updated', mechanic });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get mechanic performance metrics
const getMechanicPerformance = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    
    const mechanic = await User.findOne({ _id: mechanicId, role: 'mechanic' })
      .select('name email mechanicDetails');
    
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }
    
    // Get completed bookings count
    const completedCount = await Booking.countDocuments({
      assignedMechanic: mechanicId,
      status: 'completed'
    });
    
    // Get reviews
    const reviewedBookings = await Booking.find({
      assignedMechanic: mechanicId,
      status: 'completed',
      'review.rating': { $exists: true, $ne: null }
    }).select('review');
    
    const totalReviews = reviewedBookings.length;
    const avgRating = totalReviews > 0 
      ? reviewedBookings.reduce((sum, b) => sum + b.review.rating, 0) / totalReviews 
      : 0;
    
    // Get revenue generated
    const revenueResult = await Booking.aggregate([
      { $match: { assignedMechanic: mechanic._id, status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    res.json({
      mechanic: {
        id: mechanic._id,
        name: mechanic.name,
        email: mechanic.email,
        specialization: mechanic.mechanicDetails?.specialization || [],
        isAvailable: mechanic.mechanicDetails?.isAvailable,
        currentWorkload: mechanic.mechanicDetails?.currentWorkload || 0
      },
      performance: {
        completedJobs: completedCount,
        totalReviews,
        averageRating: Math.round(avgRating * 10) / 10,
        totalRevenue
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all mechanics performance comparison
const getAllMechanicsPerformance = async (req, res) => {
  try {
    const mechanicsPerformance = await Booking.aggregate([
      { 
        $match: { 
          status: 'completed',
          assignedMechanic: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedMechanic',
          jobsCompleted: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          ratings: { $push: '$review.rating' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'mechanic'
        }
      },
      { $unwind: '$mechanic' },
      {
        $project: {
          name: '$mechanic.name',
          email: '$mechanic.email',
          specialization: '$mechanic.mechanicDetails.specialization',
          jobsCompleted: 1,
          totalRevenue: 1,
          averageRating: {
            $avg: {
              $filter: {
                input: '$ratings',
                as: 'rating',
                cond: { $ne: ['$$rating', null] }
              }
            }
          }
        }
      },
      { $sort: { jobsCompleted: -1 } }
    ]);
    
    res.json(mechanicsPerformance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllMechanics,
  getMechanicBookings,
  updateAvailability,
  getMechanicPerformance,
  getAllMechanicsPerformance
};
