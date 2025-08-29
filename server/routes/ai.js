const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { OpenAIStream, StreamingTextResponse } = require('ai');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    let content = '';
    for (const link of course.links) {
      try {
        const { data } = await axios.get(link);
        const $ = cheerio.load(data);
        content += $('body').text();
      } catch (error) {
        console.error(`Error scraping ${link}: ${error.message}`);
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates course outlines in JSON format. The JSON should have a "modules" array, where each module has a "title" and a "resources" array. Each resource should have a "title", "link", and "snippet".' },
        { role: 'user', content: `Generate a course outline for the topic "${topic}" based on the following content:\n\n${content}` },
      ],
    });

    const stream = OpenAIStream(response, {
      async onFinal(completion) {
        try {
          const outline = JSON.parse(completion);
          course.outline = outline;
          await course.save();
        } catch (error) {
          console.error('Error parsing or saving outline:', error);
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
