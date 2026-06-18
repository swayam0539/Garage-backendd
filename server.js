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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));