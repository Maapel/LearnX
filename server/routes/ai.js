const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { getJson } = require("serpapi");

// @route   POST api/ai/process
// @desc    Process scraped links to generate a course outline
// @access  Public
router.post('/process', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    const course = await Course.findOne({ topic });

    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    // AI processing logic will be implemented here.
    const response = await getJson({
      engine: "google",
      q: topic,
      api_key: process.env.SERPAPI_API_KEY,
    });

    const organicResults = response.organic_results;

    const outline = organicResults.map(result => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet
    }));

    course.outline = {
      modules: [
        {
          title: "Introduction",
          resources: outline
        }
      ]
    };

    await course.save();

    res.json(course);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
