const mongoose = require('mongoose');

const checkPointSchema = new mongoose.Schema({
  time: { type: Date },
  lat: { type: Number },
  lng: { type: Number },
  withinGeofence: { type: Boolean }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingDay', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkIn: { type: checkPointSchema, default: {} },
  checkOut: { type: checkPointSchema, default: {} },
  status: { type: String, enum: ['present', 'absent', 'late', 'remote', 'half'], default: 'present' },
  isManualEntry: { type: Boolean, default: false },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

attendanceSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
