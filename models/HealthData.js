const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  temperature: Number,
  bloodPressure: String,
  heartRate: Number,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('HealthData', healthDataSchema);
