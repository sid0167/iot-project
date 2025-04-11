const express = require('express');
const jwt = require('jsonwebtoken');
const HealthData = require('../models/HealthData');
const router = express.Router();
const moment = require('moment'); 
const Vitals = require('../models/UserVitals');

// ✅ Middleware to verify JWT token (move this up)
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

// ✅ Route to get 3-month health data
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
// TEMP: Insert 2 weeks of sample data

// GET /api/health/timeline
router.get('/timeline', authMiddleware, async (req, res) => {
  try {
    const data = await HealthData.find({ user: req.userId }).sort({ timestamp: 1 });
    res.json(data);
  } catch (err) {
    console.error('Timeline fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// routes/health.js
router.post('/gemini', authMiddleware, async (req, res) => {
  const { mode, userMessage } = req.body;
  const userId = req.userId;

  try {
    let prompt = '';

    if (mode === 'advice') {
      const healthData = await Health.find({ userId });
      if (!healthData.length) {
        return res.status(404).json({ message: 'No data for advice' });
      }

      const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
      const summary = {
        temperature: avg(healthData.map(r => r.temperature)).toFixed(1),
        heartRate: avg(healthData.map(r => r.heartRate)).toFixed(1),
        bloodPressure: avg(healthData.map(r => r.bloodPressure)).toFixed(1),
      };

      prompt = `My health vitals are: Temperature: ${summary.temperature}, Heart Rate: ${summary.heartRate}, Blood Pressure: ${summary.bloodPressure}. Give personalized health and lifestyle advice.`;
    } else if (mode === 'chat') {
      if (!userMessage) {
        return res.status(400).json({ message: 'No message provided for chat.' });
      }
      prompt = userMessage;
    } else {
      return res.status(400).json({ message: 'Invalid mode' });
    }

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await geminiResponse.json();

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
    res.json({ message: reply });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ message: 'Gemini request failed' });
  }
});


//hieght, weight & BMI
router.post('/vitals', authMiddleware, async (req, res) => {
  const { height, weight } = req.body;
  const userId = req.userId;

  if (!height || !weight) {
    return res.status(400).json({ message: 'Height and weight are required.' });
  }

  try {
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);

    const vitalsEntry = new Vitals({
      userId,
      height,
      weight,
      bmi
    });

    await vitalsEntry.save();

    res.json({ message: '✅ Height, weight & BMI saved successfully.', bmi });
  } catch (error) {
    console.error('Vitals Save Error:', error);
    res.status(500).json({ message: '❌ Failed to save vitals.' });
  }
});
module.exports = router;
