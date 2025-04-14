const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors({
  origin: 'https://iot-project-frontend-2dqv.onrender.com', // ✅ Replace this with your actual frontend Render URL
  credentials: true
}));
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('IoT Health API is running ✅');
});

// Example Express route
app.get('/bmi', (req, res) => {
  const apiUrl = 'https://iot-project-25ym.onrender.com';
  const token = req.query.token || '';
  res.render('bmi', { apiUrl, token });
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.error('DB error:', err));

 

