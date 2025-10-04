const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAIStream, GoogleGenerativeAIStream, StreamingTextResponse } = require('ai');

/*
const activeLLM = process.env.ACTIVE_LLM || 'openai'; // Default to openai

let llm;
if (activeLLM === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  llm = genAI.getGenerativeModel({ model: 'gemini-pro' });
} else {
  llm = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
*/

// @route   POST api/ai/process
// @desc    Process scraped links to generate a course outline
// @access  Public
/*
router.post('/process', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    // For now, just send a success message to confirm communication
    res.json({ msg: `Received topic: ${topic}. AI processing is temporarily disabled.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
*/

module.exports = router;
