const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Import cors

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors()); // Use cors middleware

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
