const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number },
  radiusMeters: { type: Number, default: 100 }
}, { _id: false });

const workingDaySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  agenda: { type: String, trim: true },
  location: { type: locationSchema, default: {} },
  enforceGeofence: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed', 'cancelled'], default: 'upcoming' },
  remindersSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('WorkingDay', workingDaySchema);
