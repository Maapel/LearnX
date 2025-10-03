const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Import cors

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
// Configure CORS to allow requests from your frontend domain
const corsOptions = {
  origin: 'https://learn-x-blond.vercel.app', // Replace with your actual frontend URL
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions)); // Use cors middleware with specific options

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Basic route
app.get('/', (req, res) => {
  res.send('LearnX Backend API');
});

// Use Routes
app.use('/api/scrape', require('./routes/scrape'));
app.use('/api/ai', require('./routes/ai'));

module.exports = app;
