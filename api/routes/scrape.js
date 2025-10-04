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
    console.log(`Processing topic: ${topic}`);

    // Simple mock data for any topic (no external API dependency)
    const mockLinks = [
      {
        title: `${topic} - Complete Tutorial`,
        link: `https://example.com/${topic.toLowerCase()}-tutorial`,
        snippet: `Learn ${topic} from beginner to advanced with practical examples and exercises.`
      },
      {
        title: `${topic} Documentation`,
        link: `https://docs.example.com/${topic.toLowerCase()}`,
        snippet: `Official documentation and API reference for ${topic}.`
      },
      {
        title: `${topic} Video Course`,
        link: `https://youtube.com/watch?v=${topic.toLowerCase()}-course`,
        snippet: `Video course covering ${topic} with practical demonstrations.`
      },
      {
        title: `${topic} Practice Exercises`,
        link: `https://practice.example.com/${topic.toLowerCase()}`,
        snippet: `Hands-on exercises to practice ${topic} concepts.`
      }
    ];

    console.log(`Generated ${mockLinks.length} learning resources for ${topic}`);

    // Return the mock data
    res.json({
      topic,
      links: mockLinks,
      count: mockLinks.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
