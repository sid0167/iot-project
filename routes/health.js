const express = require('express');
const jwt = require('jsonwebtoken');
const HealthData = require('../models/HealthData');
const router = express.Router();

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

module.exports = router;
