
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.set('port', (process.env.PORT || 8081));

// Import routes
const scrapeRoute = require('./routes/scrape');

// Test endpoint
app.get('/api', (req, res) => {
  res.send('Hello from our server!');
});

// Scraping endpoint
app.use('/api/scrape', scrapeRoute);

app.listen(app.get('port'), function() {
  console.log('Express app vercel-express-react-demo is running on port', app.get('port'));
});

module.exports = app;
