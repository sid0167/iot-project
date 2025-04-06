const express = require('express');
const jwt = require('jsonwebtoken');
const HealthData = require('../models/HealthData');
const router = express.Router();

const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// POST data
router.post('/', authMiddleware, async (req, res) => {
  const { temperature, bloodPressure, heartRate } = req.body;
  const entry = await HealthData.create({
    temperature,
    bloodPressure,
    heartRate,
    user: req.userId,
  });
  res.json(entry);
});

// GET latest
router.get('/latest', authMiddleware, async (req, res) => {
  const data = await HealthData.find({ user: req.userId }).sort({ timestamp: -1 }).limit(1);
  res.json(data[0] || {});
});

module.exports = router;
