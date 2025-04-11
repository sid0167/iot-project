const mongoose = require('mongoose');

const userVitalsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  height: Number, // in cm
  weight: Number, // in kg
  bmi: Number, // calculated
  recordedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserVitals', userVitalsSchema);
