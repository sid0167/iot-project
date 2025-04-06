const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Register

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  console.log('📥 Register endpoint hit');
  console.log('Received:', { email, password });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });

    console.log('✅ User created:', user._id);
    res.json({ message: 'User created successfully', userId: user._id });
  } catch (err) {
    console.error('❌ Error in registration:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

module.exports = router;


