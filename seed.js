const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Service = require('./models/Service');
const Slot = require('./models/Slot');

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const TIME_SLOTS = [
  { startTime: '09:00', endTime: '10:00' },
  { startTime: '10:00', endTime: '11:00' },
  { startTime: '11:00', endTime: '12:00' },
  { startTime: '13:00', endTime: '14:00' },
  { startTime: '14:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '16:00' },
  { startTime: '16:00', endTime: '17:00' },
];

const seed = async () => {
  // Admin
  await User.deleteMany({ role: 'admin' });
  await User.create({
    name: 'Admin User',
    email: 'admin',
    password: 'admin123',
    phone: '9999999999',
    role: 'admin',
  });

  // Services
  await Service.deleteMany();
  await Service.insertMany([
    { name: 'Oil Change',        description: 'Full synthetic oil change',               category: 'maintenance', basePrice: 799,  duration: 60,  icon: '\u{1F6E2}\uFE0F' },
    { name: 'Car Wash',          description: 'Full exterior and interior wash',         category: 'cleaning',    basePrice: 299,  duration: 45,  icon: '\u{1F6BF}' },
    { name: 'Tire Rotation',     description: 'Rotate all 4 tires',                     category: 'tires',       basePrice: 499,  duration: 30,  icon: '\u{1F504}' },
    { name: 'Brake Inspection',  description: 'Full brake system check',                category: 'inspection',  basePrice: 599,  duration: 60,  icon: '\u{1F6D1}' },
    { name: 'Battery Check',     description: 'Battery health test and terminal clean',  category: 'electrical',  basePrice: 199,  duration: 20,  icon: '\u{1F50B}' },
    { name: 'Full Service',      description: 'Comprehensive vehicle service',          category: 'maintenance', basePrice: 1999, duration: 180, icon: '\u2B50' },
  ]);

  // Slots — generate for the next 60 days (skip Sundays)
  await Slot.deleteMany({});
  const slotsToInsert = [];
  const today = new Date();

  for (let d = 0; d < 60; d++) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() + d);

    // Skip Sundays (0 = Sunday in UTC)
    if (day.getUTCDay() === 0) continue;

    // Always store as UTC midnight so GET /slots?date=YYYY-MM-DD matches exactly
    const dateStr = day.toISOString().split('T')[0];
    const utcDate = new Date(dateStr + 'T00:00:00.000Z');

    for (const ts of TIME_SLOTS) {
      slotsToInsert.push({
        date: utcDate,
        startTime: ts.startTime,
        endTime: ts.endTime,
        maxCapacity: 3,
        currentBookings: 0,
        isAvailable: true,
      });
    }
  }

  await Slot.insertMany(slotsToInsert);

  console.log('Database seeded!');
  console.log('Admin: admin / admin123');
  console.log('Slots created:', slotsToInsert.length, '(60 days, 7 slots/day, no Sundays)');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
