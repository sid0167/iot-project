// models/HealthData.js
const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ✅ rename to 'user'
  heartRate: Number,
  temperature: Number,
  spo2: String, // ✅ ADD this field if you're using it in your dashboard
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HealthData', healthDataSchema);