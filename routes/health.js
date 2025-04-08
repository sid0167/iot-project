const express = require('express');
const jwt = require('jsonwebtoken');
const HealthData = require('../models/HealthData');
const router = express.Router();
const moment = require('moment'); 

// Route to get 3-month health data
router.get('/last-three-months', authMiddleware, async (req, res) => {
  try {
    const threeMonthsAgo = moment().subtract(3, 'months').toDate();
    const data = await HealthData.find({
      user: req.userId,
      timestamp: { $gte: threeMonthsAgo }
    }).sort({ timestamp: 1 });

    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching 3-month data:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token provided' });

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ✅ POST health data
router.post('/', authMiddleware, async (req, res) => {
  const { temperature, bloodPressure, heartRate } = req.body;

  if (!temperature || !bloodPressure || !heartRate) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const entry = await HealthData.create({
      temperature,
      bloodPressure,
      heartRate,
      user: req.userId,
      timestamp: new Date()
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error('❌ Error saving data:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ GET latest health data
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const data = await HealthData.find({ user: req.userId }).sort({ timestamp: -1 }).limit(1);
    res.json(data[0] || {});
  } catch (err) {
    console.error('❌ Error fetching latest data:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ GET all health records
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const records = await HealthData.find({ user: req.userId }).sort({ timestamp: -1 });
    res.json(records);
  } catch (err) {
    console.error('❌ Error fetching all records:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
// ✅ GET health prediction based on last week's average
router.get('/predict', authMiddleware, async (req, res) => {
  const oneWeekAgo = moment().subtract(7, 'days').toDate();
  const data = await HealthData.find({
    user: req.userId,
    timestamp: { $gte: oneWeekAgo }
  });

  if (data.length === 0) return res.json({ message: "No recent data" });

  const avg = (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length;

  const tempAvg = avg(data.map(d => d.temperature));
  const heartAvg = avg(data.map(d => d.heartRate));

  res.json({
    prediction: "Stable",
    averageTemperature: tempAvg.toFixed(2),
    averageHeartRate: heartAvg.toFixed(2)
  });
});




module.exports = router;
