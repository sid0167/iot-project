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
  const { temperature, spo2, heartRate } = req.body;

  if (!temperature || !spo2 || !heartRate) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const entry = await HealthData.create({
      temperature,
      spo2,
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
// ✅ GET health prediction based on latest data with nuanced analysis
router.get('/predict', authMiddleware, async (req, res) => {
  const latestData = await HealthData.findOne({ user: req.userId })
    .sort({ timestamp: -1 }); // Get the latest entry

  if (!latestData) {
    return res.json({ message: "No data available" });
  }

  const temperature = latestData.temperature;
  const heartRate = latestData.heartRate;

  // Predict temperature status
  let tempStatus = "Normal";
  if (temperature > 38.5) tempStatus = "High Fever";
  else if (temperature > 37.5) tempStatus = "Slightly High";
  else if (temperature < 35.5) tempStatus = "Very Low";
  else if (temperature < 36.5) tempStatus = "Slightly Low";

  // Predict heart rate status
  let heartStatus = "Normal";
  if (heartRate > 110) heartStatus = "High Heart Rate";
  else if (heartRate > 90) heartStatus = "Slightly High";
  else if (heartRate < 50) heartStatus = "Very Low Heart Rate";
  else if (heartRate < 60) heartStatus = "Slightly Low";

  // Combined prediction
  let prediction = "Stable";
  if (tempStatus !== "Normal" || heartStatus !== "Normal") {
    prediction = `${tempStatus}, ${heartStatus}`;
  }

  res.json({
    prediction,
    temperature: temperature.toFixed(2),
    heartRate: heartRate.toFixed(2),
    temperatureStatus: tempStatus,
    heartRateStatus: heartStatus
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
      const healthData = await HealthData.find({ user: userId }); // Use HealthData here
      if (!healthData.length) {
        return res.status(404).json({ message: 'No data for advice' });
      }

      const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
      const summary = {
        temperature: avg(healthData.map(r => r.temperature)).toFixed(1),
        heartRate: avg(healthData.map(r => r.heartRate)).toFixed(1),
        spo2: avg(healthData.map(r => r.spo2)).toFixed(1),
      };

      prompt = `My health vitals are: Temperature: ${summary.temperature}, Heart Rate: ${summary.heartRate}, spo2 ${summary.spo2}. Give personalized health and lifestyle advice.`; // Use spo2
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


// hieght, weight & BMI
// height, weight & BMI with category
router.post('/UserVitals', authMiddleware, async (req, res) => {
  const { height, weight } = req.body;
  const userId = req.userId;

  if (!height || !weight) {
    return res.status(400).json({ message: 'Height and weight are required.' });
  }

  try {
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);

    let category = '';
    const bmiVal = parseFloat(bmi);

    if (bmiVal < 18.5) category = 'Underweight';
    else if (bmiVal < 24.9) category = 'Normal weight';
    else if (bmiVal < 29.9) category = 'Overweight';
    else category = 'Obese';

    const vitalsEntry = new Vitals({
      userId,
      height,
      weight,
      bmi
    });

    await vitalsEntry.save();

    res.json({
      message: '✅ Height, weight & BMI saved successfully.',
      bmi,
      category
    });
  } catch (error) {
    console.error('Vitals Save Error:', error);
    res.status(500).json({ message: '❌ Failed to save vitals.' });
  }
});
module.exports = router;