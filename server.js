const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config({ path: path.join(__dirname, '.env') });
connectDB();

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL && process.env.CLIENT_URL.trim(),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // allow all for now, tighten later
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/mechanics', require('./routes/mechanicRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/roadside', require('./routes/roadsideRoutes'));

app.get('/', (req, res) => res.send('Garage API Running ✅'));

// Temporary one-time seed route — remove after use
app.get('/run-seed-once-xk9z', async (req, res) => {
  try {
    const User = require('./models/User');
    const Service = require('./models/Service');
    const Slot = require('./models/Slot');

    await User.deleteMany({ role: 'admin' });
    await User.create({ name: 'Admin User', email: 'admin', password: 'admin123', phone: '9999999999', role: 'admin' });

    await Service.deleteMany();
    await Service.insertMany([
      { name: 'Oil Change',       description: 'Full synthetic oil change',              category: 'maintenance', basePrice: 799,  duration: 60,  icon: '🛢️' },
      { name: 'Car Wash',         description: 'Full exterior and interior wash',        category: 'cleaning',    basePrice: 299,  duration: 45,  icon: '🚿' },
      { name: 'Tire Rotation',    description: 'Rotate all 4 tires',                    category: 'tires',       basePrice: 499,  duration: 30,  icon: '🔄' },
      { name: 'Brake Inspection', description: 'Full brake system check',               category: 'inspection',  basePrice: 599,  duration: 60,  icon: '🛑' },
      { name: 'Battery Check',    description: 'Battery health test and terminal clean', category: 'electrical',  basePrice: 199,  duration: 20,  icon: '🔋' },
      { name: 'Full Service',     description: 'Comprehensive vehicle service',         category: 'maintenance', basePrice: 1999, duration: 180, icon: '⭐' },
    ]);

    await Slot.deleteMany({});
    const TIME_SLOTS = [
      { startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' },
      { startTime: '11:00', endTime: '12:00' }, { startTime: '13:00', endTime: '14:00' },
      { startTime: '14:00', endTime: '15:00' }, { startTime: '15:00', endTime: '16:00' },
      { startTime: '16:00', endTime: '17:00' },
    ];
    const slotsToInsert = [];
    const today = new Date();
    for (let d = 0; d < 60; d++) {
      const day = new Date(today);
      day.setUTCDate(today.getUTCDate() + d);
      if (day.getUTCDay() === 0) continue;
      const dateStr = day.toISOString().split('T')[0];
      const utcDate = new Date(dateStr + 'T00:00:00.000Z');
      for (const ts of TIME_SLOTS) slotsToInsert.push({ date: utcDate, ...ts, maxCapacity: 3, currentBookings: 0, isAvailable: true });
    }
    await Slot.insertMany(slotsToInsert);

    res.send('✅ Database seeded! Admin: admin / admin123. Delete this route now.');
  } catch (err) {
    res.status(500).send('❌ Seed failed: ' + err.message);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));