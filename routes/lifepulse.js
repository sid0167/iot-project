const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const moment = require('moment');
const HealthData = require('../models/HealthData');

// Auth Middleware
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

// 1. Get Timeline Data with Optional Month Filter
router.get('/timeline', authMiddleware, async (req, res) => {
  try {
    const { month } = req.query;
    const start = month ? moment(month, 'YYYY-MM').startOf('month').toDate() : moment().subtract(3, 'months').toDate();
    const end = month ? moment(month, 'YYYY-MM').endOf('month').toDate() : new Date();

    const data = await HealthData.find({
      user: req.userId,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 });

    res.json(data);
  } catch (err) {
    console.error("Timeline error:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Generate Weekly Analytics Summary
router.get('/timeline/summary', authMiddleware, async (req, res) => {
  try {
    const threeMonthsAgo = moment().subtract(3, 'months').toDate();
    const data = await HealthData.find({ user: req.userId, timestamp: { $gte: threeMonthsAgo } }).sort({ timestamp: 1 });

    const grouped = {};
    data.forEach(entry => {
      const week = moment(entry.timestamp).startOf('week').format('YYYY-MM-DD');
      if (!grouped[week]) grouped[week] = [];
      grouped[week].push(entry);
    });

    const summary = Object.entries(grouped).map(([week, records]) => {
      const avg = (arr, field) => arr.reduce((sum, val) => sum + val[field], 0) / arr.length;
      return {
        weekStart: week,
        temperature: avg(records, 'temperature').toFixed(2),
        heartRate: avg(records, 'heartRate').toFixed(2),
        bloodPressure: avg(records, 'bloodPressure').toFixed(2),
      };
    });

    res.json(summary);
  } catch (err) {
    console.error("Summary error:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. AI Health Summary (Simple Mock)
router.get('/timeline/ai-summary', authMiddleware, async (req, res) => {
  try {
    const lastMonth = moment().subtract(1, 'months').toDate();
    const data = await HealthData.find({ user: req.userId, timestamp: { $gte: lastMonth } });

    if (!data.length) return res.json({ message: "Not enough data for AI summary." });

    const tempAvg = data.reduce((s, d) => s + d.temperature, 0) / data.length;
    const heartAvg = data.reduce((s, d) => s + d.heartRate, 0) / data.length;

    const summary = `In the past month, your average temperature was ${tempAvg.toFixed(1)}°C and your heart rate averaged at ${heartAvg.toFixed(0)} bpm. You're doing well! Keep monitoring regularly.`;

    res.json({ aiSummary: summary });
  } catch (err) {
    console.error("AI summary error:", err.message);
    res.status(500).json({ message: 'Error generating summary' });
  }
});

module.exports = router;
