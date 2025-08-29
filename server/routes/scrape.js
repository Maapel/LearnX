const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const Course = require('../models/Course');

// @route   POST api/scrape
// @desc    Scrape web content for a given topic
// @access  Public
router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${topic}`;
    const { data } = await axios.get(searchUrl);
    const $ = cheerio.load(data);

    const links = [];
    $('.result__url').each((i, el) => {
      links.push($(el).text().trim());
    });

    let course = await Course.findOne({ topic });

    if (course) {
      // If course exists, update it
      course.links = links;
      await course.save();
      res.json(course);
    } else {
      // If course doesn't exist, create a new one
      course = new Course({
        topic,
        links
      });
      await course.save();
      res.json(course);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
