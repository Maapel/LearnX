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
    let courseStructure = null;

    if (req.body.evaluateAuthenticity && req.body.apiKey && req.body.apiKey.trim()) {
      try {
        console.log('Evaluating authenticity of search results with provider:', req.body.provider || 'gemini');
        const provider = req.body.provider || 'gemini';
        mostAuthenticSource = await evaluateAuthenticity(searchResults, topic, req.body.apiKey.trim(), provider);
        console.log('Most authentic source evaluation completed');

        // If authenticity evaluation succeeded and user wants course generation
        if (mostAuthenticSource && req.body.generateCourse) {
          console.log('Generating course structure from most authentic source...');
          courseStructure = await generateCourseFromSource(mostAuthenticSource, topic, req.body.apiKey.trim(), provider);
          console.log('Course structure generation completed');
        }
      } catch (authError) {
        console.error('Authenticity evaluation failed:', authError.message);
        console.error('Full auth error:', authError);
        // Continue without authenticity evaluation - don't fail the whole request
        mostAuthenticSource = null;
      }
    }

    // Return the extracted content
    res.json({
      topic,
      content: courseContent,
      searchResults: searchResults,
      count: searchResults.length,
      searchInformation: response.data.searchInformation || {},
      mostAuthenticSource: mostAuthenticSource,
      courseStructure: courseStructure
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
      // First try direct parsing
      const parsedResponse = JSON.parse(aiResponse);
      return parsedResponse.mostAuthenticSource;
    } catch (parseError) {
      console.log(`Failed to parse ${provider} authenticity response as JSON:`, aiResponse);
      // Try to extract JSON from the response text
      try {
        // Look for JSON object in the text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson.mostAuthenticSource;
        }
      } catch (extractError) {
        console.log('Failed to extract JSON from response:', extractError);
      }
      // Fallback to text extraction
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
      model: 'llama-3.3-70b-versatile', // Updated to match working model from curl test
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

// Helper function to generate course structure from the most authentic source
async function generateCourseFromSource(mostAuthenticSource, topic, apiKey, provider) {
  try {
    console.log('Scraping content from most authentic source:', mostAuthenticSource.url);

    // Scrape the content from the most authentic source
    const scrapedContent = await scrapeWebpageContent(mostAuthenticSource.url);

    if (!scrapedContent || scrapedContent.length < 100) {
      console.log('Insufficient content scraped, using fallback');
      return createFallbackCourseStructure(topic);
    }

    console.log('Generating course structure from scraped content...');

    // Use AI to generate course structure from the scraped content
    const coursePrompt = `
You are an expert educational content creator. I have scraped content from a highly authentic source about "${topic}". 

Here is the scraped content:
${scrapedContent.substring(0, 8000)} // Limit content length

Please create a comprehensive, structured course based on this content. The course should include:

1. **Course Title**: A clear, engaging title
2. **Course Description**: Brief overview (2-3 sentences)
3. **Learning Objectives**: 3-5 main objectives
4. **Prerequisites**: Any required background knowledge
5. **Course Modules**: 4-6 modules, each containing:
   - Module title
   - Learning objectives for the module
   - Key concepts to cover
   - Practical exercises or activities
   - Estimated time to complete

6. **Assessment Methods**: How learners can test their knowledge
7. **Resources**: Additional recommended resources

Return the response in this exact JSON format:
{
  "courseTitle": "Course Title Here",
  "description": "Course description here",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "modules": [
    {
      "title": "Module Title",
      "objectives": ["Objective 1", "Objective 2"],
      "concepts": ["Concept 1", "Concept 2", "Concept 3"],
      "exercises": ["Exercise 1", "Exercise 2"],
      "estimatedTime": "X hours"
    }
  ],
  "assessmentMethods": ["Method 1", "Method 2"],
  "additionalResources": ["Resource 1", "Resource 2"]
}
`;

    let courseResponse;

    if (provider === 'groq') {
      courseResponse = await evaluateWithGroq(coursePrompt, apiKey);
    } else {
      courseResponse = await evaluateWithGemini(coursePrompt, apiKey);
    }

    // Try to parse the course structure response
    try {
      const courseStructure = JSON.parse(courseResponse);
      console.log('Course structure generated successfully');
      return courseStructure;
    } catch (parseError) {
      console.log('Failed to parse course structure JSON, using fallback');
      return createFallbackCourseStructure(topic);
    }

  } catch (error) {
    console.error('Error generating course from source:', error);
    return createFallbackCourseStructure(topic);
  }
}

// Helper function to scrape webpage content
async function scrapeWebpageContent(url) {
  try {
    console.log('Scraping content from:', url);

    // For Vercel deployment, we'll use a simple approach
    // In production, you might want to use a more robust scraping service
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Simple HTML text extraction (very basic - in production use a proper HTML parser)
    // Remove script and style tags
    let textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    textContent = textContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    textContent = textContent.replace(/<[^>]+>/g, ' '); // Remove HTML tags
    textContent = textContent.replace(/\s+/g, ' ').trim(); // Clean up whitespace

    // Extract meaningful content (rough approximation)
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const meaningfulContent = sentences.slice(0, 50).join('. ') + '.'; // Limit to first 50 sentences

    console.log('Successfully scraped content, length:', meaningfulContent.length);
    return meaningfulContent;

  } catch (error) {
    console.error('Error scraping webpage:', error);
    return null;
  }
}

// Helper function to create fallback course structure
function createFallbackCourseStructure(topic) {
  return {
    courseTitle: `Introduction to ${topic}`,
    description: `A comprehensive course on ${topic} covering fundamental concepts and practical applications.`,
    learningObjectives: [
      `Understand the basic concepts of ${topic}`,
      `Apply ${topic} principles in practical scenarios`,
      `Develop problem-solving skills related to ${topic}`
    ],
    prerequisites: [
      'Basic computer literacy',
      'High school level mathematics (recommended)'
    ],
    modules: [
      {
        title: `Introduction to ${topic}`,
        objectives: [`Understand what ${topic} is`, 'Learn basic terminology'],
        concepts: ['Core concepts', 'Key terminology', 'Basic principles'],
        exercises: ['Reading assignments', 'Basic quizzes'],
        estimatedTime: '2-3 hours'
      },
      {
        title: `Core Concepts of ${topic}`,
        objectives: ['Master fundamental concepts', 'Understand relationships between concepts'],
        concepts: ['Advanced concepts', 'Theoretical foundations', 'Practical applications'],
        exercises: ['Practice exercises', 'Case studies'],
        estimatedTime: '4-5 hours'
      },
      {
        title: `Practical Applications`,
        objectives: ['Apply knowledge in real scenarios', 'Solve practical problems'],
        concepts: ['Real-world applications', 'Best practices', 'Common patterns'],
        exercises: ['Hands-on projects', 'Problem-solving exercises'],
        estimatedTime: '6-8 hours'
      },
      {
        title: `Advanced Topics`,
        objectives: ['Explore advanced concepts', 'Understand complex scenarios'],
        concepts: ['Advanced techniques', 'Specialized topics', 'Future trends'],
        exercises: ['Advanced projects', 'Research assignments'],
        estimatedTime: '4-6 hours'
      }
    ],
    assessmentMethods: [
      'Quizzes and tests',
      'Practical assignments',
      'Final project'
    ],
    additionalResources: [
      'Official documentation',
      'Online tutorials',
      'Community forums'
    ]
  };
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
          reasoning: 'Extracted from AI text response'
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
