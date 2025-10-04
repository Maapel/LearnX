const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const google = require('google-it');

// @route   POST api/scrape
// @desc    Scrape web content for a given topic
// @access  Public
router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    console.log(`Searching for topic: ${topic}`);
    // Use google-it to get initial search results
    const searchResults = await google({ query: topic, limit: 5 }); // Limit to 5 results for efficiency
    console.log('Google-it Search Results:', searchResults);

    const links = [];
    for (const result of searchResults) {
      if (result && result.link) {
        links.push({
          title: result.title,
          link: result.link,
          snippet: result.snippet
        });
      }
    }

    // Filter out any null or undefined links
    const filteredLinks = links.filter(link => link && link.link && link.link.startsWith('http'));
    console.log('Filtered Links:', filteredLinks);

    // Return the scraped links directly (no database for now)
    res.json({
      topic,
      links: filteredLinks,
      count: filteredLinks.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
