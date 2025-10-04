const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const google = require('google-it');
const Course = require('../models/Course');

// @route   POST api/scrape
// @desc    Scrape web content for a given topic
// @access  Public
/*
router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    console.log(`Searching for topic: ${topic}`);
    // Use google-it to get initial search results
    const searchResults = await google({ query: topic, limit: 5 , diagnostics:true}); // Limit to 5 results for efficiency
    console.log('Google-it Search Results:', searchResults);

    const links = [];
    for (const result of searchResults) {
      links.push(result.link);
    }

    // Filter out any null or undefined links
    const filteredLinks = links.filter(link => link && link.startsWith('http'));
    console.log('Filtered Links:', filteredLinks);

    let course = await Course.findOne({ topic });

    if (course) {
      course.links = filteredLinks;
      await course.save();
      res.json(course);
    } else {
      course = new Course({
        topic,
        links: filteredLinks
      });
      await course.save();
      res.json(course);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
*/

module.exports = router;
