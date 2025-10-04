const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Initialize Google Custom Search API
const customsearch = google.customsearch('v1');

// @route   POST api/scrape
// @desc    Scrape web content for a given topic using Google Custom Search API
// @access  Public
router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    console.log(`Searching for topic: ${topic}`);

    // Use Google Custom Search API
    const response = await customsearch.cse.list({
      cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
      q: topic,
      auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      num: 5, // Limit to 5 results for efficiency
    });

    console.log('Google Custom Search API Response:', response.data);

    const links = [];
    if (response.data.items) {
      for (const item of response.data.items) {
        links.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet || item.displayLink
        });
      }
    }

    console.log('Filtered Links:', links);

    // Return the scraped links directly
    res.json({
      topic,
      links: links,
      count: links.length,
      searchInformation: response.data.searchInformation
    });
  } catch (err) {
    console.error('Google Custom Search API Error:', err.message);
    res.status(500).json({
      msg: 'Server Error',
      error: err.message,
      details: 'Failed to fetch search results from Google Custom Search API'
    });
  }
});

module.exports = router;
// AIzaSyCSb8ujMdmMsQ38XG2rZ_iHEWACl6CDaOs
