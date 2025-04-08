const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const axios = require('axios');
const router = express.Router();

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Setup nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // Your Gmail ID
    pass: process.env.EMAIL_PASS      // Your Gmail App Password
  }
});

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  console.log('📥 Register endpoint hit');
  console.log('Received:', { email });

  try {
    // 1. Check if email is valid (stubbed logic here)
    // Optional: use an API like https://www.abstractapi.com/email-verification
    const emailValidation = await axios.get(`https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.EMAIL_API_KEY}&email=${email}`);
    if (!emailValidation.data.deliverability || emailValidation.data.deliverability !== "DELIVERABLE") {
      return res.status(400).json({ message: 'Email does not appear valid' });
    }

    // 2. Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 3. Hash password and save user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });

    // 4. Send welcome email
    await transporter.sendMail({
      from: `"IoT Health App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to the IoT Health App!',
      html: `<h2>Welcome, ${email}</h2><p>Your account has been created successfully. Stay healthy! 💙</p>`
    });

    console.log('✅ User created and email sent:', user._id);
    res.json({ message: 'User created successfully', userId: user._id });
  } catch (err) {
    console.error('❌ Error in registration:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, userId: user._id });
  } catch (err) {
    console.error('❌ Error in login:', err.message);
    res.status(500).json({ message: 'Login error' });
  }
});

module.exports = router;
