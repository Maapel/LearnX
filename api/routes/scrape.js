const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Initialize Google Custom Search API
const customsearch = google.customsearch('v1');

// @route   POST api/scrape
// @desc    Search for course content using Google Custom Search API and return text content
// @access  Public
router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    console.log(`Searching for course content on: ${topic}`);

    // Create course-focused search query
    const courseQuery = `${topic} course content OR tutorial OR guide OR "learning objectives" OR curriculum`;

    // Use Google Custom Search API
    const response = await customsearch.cse.list({
      cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
      q: courseQuery,
      auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      num: 5, // Limit to 5 results for course content
    });

    console.log('Google Custom Search API Response received');

    if (!response.data || !response.data.items) {
      console.log('No search results found');
      return res.json({
        topic,
        content: `No course content found for ${topic}. Try a different search term.`,
        searchResults: [],
        count: 0
      });
    }

    console.log('Search results:', response.data.items.length);

    // Extract text content from search results
    const searchResults = response.data.items.map(item => ({
      title: item.title || 'Untitled',
      url: item.link || '',
      snippet: item.snippet || 'No description available',
      displayLink: item.displayLink || ''
    }));

    // Combine all snippets and titles into course content
    const allContent = searchResults.map(result =>
      `Title: ${result.title}\nContent: ${result.snippet}\nURL: ${result.url}`
    ).join('\n\n');

    const courseContent = `
COURSE CONTENT FOR: ${topic.toUpperCase()}

${allContent}

SUMMARY:
This course content was extracted from ${searchResults.length} web sources to help you learn ${topic}.
Use this information as a starting point for your learning journey.
`;

    // Optionally evaluate authenticity using AI API (Gemini or Groq)
    let mostAuthenticSource = null;
    if (req.body.evaluateAuthenticity && req.body.apiKey) {
      try {
        console.log('Evaluating authenticity of search results...');
        const provider = req.body.provider || 'gemini'; // Default to gemini
        mostAuthenticSource = await evaluateAuthenticity(searchResults, topic, req.body.apiKey, provider);
        console.log('Most authentic source:', mostAuthenticSource);
      } catch (authError) {
        console.error('Authenticity evaluation failed:', authError.message);
        // Continue without authenticity evaluation
      }
    }

    // Return the extracted content
    res.json({
      topic,
      content: courseContent,
      searchResults: searchResults,
      count: searchResults.length,
      searchInformation: response.data.searchInformation || {},
      mostAuthenticSource: mostAuthenticSource
    });

  } catch (err) {
    console.error('Search Error:', err.message);
    console.error('Full error:', err);

    // Return fallback content
    res.status(200).json({
      topic,
      content: `
FALLBACK COURSE CONTENT FOR: ${topic.toUpperCase()}

Since we couldn't fetch live search results, here's a basic course outline for ${topic}:

1. INTRODUCTION TO ${topic.toUpperCase()}
   - Basic concepts and fundamentals
   - Why ${topic} is important
   - Common use cases

2. CORE CONCEPTS
   - Key principles and theories
   - Important terminology
   - Fundamental building blocks

3. PRACTICAL APPLICATIONS
   - Real-world examples
   - Hands-on exercises
   - Best practices

4. ADVANCED TOPICS
   - Complex scenarios
   - Optimization techniques
   - Troubleshooting

Start with the basics and gradually progress to advanced topics.
Practice regularly and build projects to reinforce your learning.
`,
      searchResults: [],
      count: 0,
      fallback: true,
      error: err.message
    });
  }
});

// Helper function to evaluate authenticity of search results using AI API
async function evaluateAuthenticity(searchResults, topic, apiKey, provider = 'gemini') {
  try {
    // Prepare the search results for evaluation
    const resultsText = searchResults.map((result, index) =>
      `Source ${index + 1}:
Title: ${result.title}
URL: ${result.url}
Domain: ${result.displayLink}
Snippet: ${result.snippet}`
    ).join('\n\n');

    const evaluationPrompt = `
You are an expert at evaluating the authenticity and reliability of educational content sources.

Given the following search results for the topic "${topic}", analyze each source and determine which one appears to be the MOST AUTHENTIC and RELIABLE for learning this topic.

Search Results:
${resultsText}

Please evaluate each source based on:
1. Domain authority (.edu, .org, .gov domains are generally more reliable)
2. Content relevance to the topic
3. Professional presentation
4. Educational focus
5. Credibility indicators

Return ONLY a JSON object in this exact format:
{
  "mostAuthenticSource": {
    "index": 0,
    "title": "Source Title",
    "url": "https://source.url",
    "domain": "source.com",
    "reasoning": "Brief explanation of why this source is most authentic"
  }
}

Choose the single most authentic source from the provided results.
`;

    let aiResponse;

    if (provider === 'groq') {
      // Use Groq API
      aiResponse = await evaluateWithGroq(evaluationPrompt, apiKey);
    } else {
      // Default to Gemini
      aiResponse = await evaluateWithGemini(evaluationPrompt, apiKey);
    }

    // Try to parse the JSON response
    try {
      const parsedResponse = JSON.parse(aiResponse);
      return parsedResponse.mostAuthenticSource;
    } catch (parseError) {
      console.log(`Failed to parse ${provider} authenticity response as JSON:`, aiResponse);
      // Try to extract information from text response
      return extractAuthenticityFromText(aiResponse, searchResults);
    }

  } catch (error) {
    console.error(`${provider} authenticity evaluation error:`, error);
    throw new Error(`Failed to evaluate authenticity with ${provider}`);
  }
}

// Helper function to evaluate with Gemini API
async function evaluateWithGemini(prompt, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Helper function to evaluate with Groq API
async function evaluateWithGroq(prompt, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192', // You can change this to other Groq models like 'mixtral-8x7b-32768'
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Fallback function to extract authenticity info from text response
function extractAuthenticityFromText(textResponse, searchResults) {
  try {
    // Look for source index in the text
    const indexMatch = textResponse.match(/source\s+(\d+)/i);
    if (indexMatch) {
      const index = parseInt(indexMatch[1]) - 1; // Convert to 0-based index
      if (index >= 0 && index < searchResults.length) {
        return {
          index: index,
          title: searchResults[index].title,
          url: searchResults[index].url,
          domain: searchResults[index].displayLink,
          reasoning: 'Extracted from Gemini text response'
        };
      }
    }

    // Default to first result if parsing fails
    return {
      index: 0,
      title: searchResults[0].title,
      url: searchResults[0].url,
      domain: searchResults[0].displayLink,
      reasoning: 'Default selection due to parsing failure'
    };
  } catch (error) {
    console.error('Error extracting authenticity from text:', error);
    return null;
  }
}

module.exports = router;
