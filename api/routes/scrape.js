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
    let aiError = null;

    if (req.body.evaluateAuthenticity && req.body.apiKey && req.body.apiKey.trim()) {
      try {
    console.log('Evaluating authenticity of search results with provider:', req.body.provider || 'gemini');
    console.log('API Key provided (first 10 chars):', req.body.apiKey.trim().substring(0, 10));
    console.log('Search results count:', searchResults.length);
    console.log('Starting AI evaluation process...');
        const provider = req.body.provider || 'gemini';
        mostAuthenticSource = await evaluateAuthenticity(searchResults, topic, req.body.apiKey.trim(), provider);
        console.log('Most authentic source evaluation completed:', mostAuthenticSource);

        // If authenticity evaluation succeeded and user wants course generation
        if (mostAuthenticSource && req.body.generateCourse) {
          console.log('Generating course structure from most authentic source...');
          courseStructure = await generateCourseFromSource(mostAuthenticSource, topic, req.body.apiKey.trim(), provider);
          console.log('Course structure generation completed');
        }
      } catch (authError) {
        console.error('Authenticity evaluation failed:', authError.message);
        console.error('Full auth error:', authError);
        aiError = authError.message;
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
      courseStructure: courseStructure,
      aiError: aiError
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
      model: 'llama-3.3-70b-versatile', // Working model
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
    console.log('Starting iterative course generation process...');

    // Phase 1: Scrape and analyze content
    console.log('Phase 1: Scraping content from most authentic source:', mostAuthenticSource.url);
    const scrapedContent = await scrapeWebpageContent(mostAuthenticSource.url);

    if (!scrapedContent || scrapedContent.length < 100) {
      console.log('Insufficient content scraped, using fallback');
      return createFallbackCourseStructure(topic);
    }

    // Phase 2: Generate high-level syllabus and module topics
    console.log('Phase 2: Generating syllabus and module topics...');
    const syllabusStructure = await generateSyllabus(scrapedContent, topic, apiKey, provider);

    // Phase 3: Generate detailed modules one by one
    console.log('Phase 3: Generating detailed module content...');
    const detailedModules = await generateDetailedModules(scrapedContent, syllabusStructure, topic, apiKey, provider);

    // Phase 4: Generate exercises and assessments for each module
    console.log('Phase 4: Generating exercises and assessments...');
    const modulesWithExercises = await generateModuleExercises(scrapedContent, detailedModules, topic, apiKey, provider);

    // Phase 5: Compile final course structure
    console.log('Phase 5: Compiling final course structure...');
    const finalCourse = {
      courseTitle: syllabusStructure.courseTitle,
      description: syllabusStructure.description,
      learningObjectives: syllabusStructure.learningObjectives,
      prerequisites: syllabusStructure.prerequisites,
      modules: modulesWithExercises,
      assessmentMethods: syllabusStructure.assessmentMethods,
      additionalResources: syllabusStructure.additionalResources,
      generationPhases: {
        phase1: 'Content scraped and analyzed',
        phase2: 'Syllabus and module topics generated',
        phase3: 'Detailed module content created',
        phase4: 'Exercises and assessments added',
        phase5: 'Course structure compiled'
      }
    };

    console.log('Iterative course generation completed successfully');
    return finalCourse;

  } catch (error) {
    console.error('Error in iterative course generation:', error);
    return createFallbackCourseStructure(topic);
  }
}

// Phase 2: Generate syllabus and high-level module topics
async function generateSyllabus(content, topic, apiKey, provider) {
  const syllabusPrompt = `
You are an expert curriculum designer. Based on the following content about "${topic}", create a high-level course syllabus.

Content:
${content.substring(0, 6000)}

Create a syllabus with:
1. Course title
2. Brief description (2-3 sentences)
3. 3-5 main learning objectives
4. Prerequisites
5. 4-6 high-level module topics (just titles and brief descriptions)
6. Assessment methods
7. Additional resources

Return in this JSON format:
{
  "courseTitle": "Title",
  "description": "Description",
  "learningObjectives": ["Obj1", "Obj2"],
  "prerequisites": ["Pre1", "Pre2"],
  "moduleTopics": [
    {"title": "Module 1", "description": "Brief description"},
    {"title": "Module 2", "description": "Brief description"}
  ],
  "assessmentMethods": ["Method1", "Method2"],
  "additionalResources": ["Resource1", "Resource2"]
}
`;

  const response = provider === 'groq' ?
    await evaluateWithGroq(syllabusPrompt, apiKey) :
    await evaluateWithGemini(syllabusPrompt, apiKey);

  try {
    return JSON.parse(response);
  } catch (e) {
    console.log('Syllabus parsing failed, using fallback');
    return createFallbackSyllabus(topic);
  }
}

// Phase 3: Generate detailed content for each module
async function generateDetailedModules(content, syllabus, topic, apiKey, provider) {
  const detailedModules = [];

  for (const moduleTopic of syllabus.moduleTopics) {
    console.log(`Generating detailed content for module: ${moduleTopic.title}`);

    const modulePrompt = `
You are creating a professional online course module. Based on the content about "${topic}" and the module topic "${moduleTopic.title}" (${moduleTopic.description}), create a comprehensive, educational module that would be suitable for a mature online learning platform.

Content:
${content.substring(0, 5000)}

Create a detailed module with the following structure:

1. **Module Overview**: A comprehensive introduction (3-4 paragraphs) explaining what students will learn and why it's important
2. **Learning Objectives**: 4-6 specific, measurable objectives
3. **Key Concepts**: 6-8 core concepts with brief explanations
4. **Detailed Topics**: 8-12 specific topics to cover, each with a short description
5. **Prerequisites**: What students should know before starting this module
6. **Estimated Time**: Realistic time estimate including reading, exercises, and practice
7. **Module Content**: A structured outline of what will be taught (like a course syllabus for this module)

Return in JSON format:
{
  "overview": "Detailed 3-4 paragraph introduction...",
  "objectives": ["Specific objective 1", "Specific objective 2", ...],
  "keyConcepts": [
    {"concept": "Concept Name", "explanation": "Brief explanation of the concept"},
    ...
  ],
  "detailedTopics": [
    {"topic": "Topic Name", "description": "Detailed description of what will be covered"},
    ...
  ],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "estimatedTime": "X hours",
  "moduleContent": "Structured outline of module content..."
}
`;

    const response = provider === 'groq' ?
      await evaluateWithGroq(modulePrompt, apiKey) :
      await evaluateWithGemini(modulePrompt, apiKey);

    try {
      const moduleDetails = JSON.parse(response);
      detailedModules.push({
        title: moduleTopic.title,
        description: moduleTopic.description,
        ...moduleDetails
      });
    } catch (e) {
      console.log(`Failed to parse module ${moduleTopic.title}, using fallback`);
      detailedModules.push({
        title: moduleTopic.title,
        description: moduleTopic.description,
        overview: `This module provides a comprehensive introduction to ${moduleTopic.title.toLowerCase()}. You will learn the fundamental concepts, practical applications, and best practices related to this important topic in ${topic}. Through structured lessons, hands-on exercises, and real-world examples, you'll develop a solid understanding that will serve as a foundation for more advanced topics.`,
        objectives: [
          `Understand the core principles of ${moduleTopic.title.toLowerCase()}`,
          `Apply ${moduleTopic.title.toLowerCase()} concepts in practical scenarios`,
          `Identify common patterns and use cases for ${moduleTopic.title.toLowerCase()}`,
          `Develop problem-solving skills related to ${moduleTopic.title.toLowerCase()}`
        ],
        keyConcepts: [
          { concept: `Basic ${moduleTopic.title}`, explanation: `Fundamental concepts and terminology` },
          { concept: `Core Principles`, explanation: `Essential principles and theories` },
          { concept: `Practical Applications`, explanation: `Real-world usage and implementation` }
        ],
        detailedTopics: [
          { topic: `Introduction to ${moduleTopic.title}`, description: `Overview and basic concepts` },
          { topic: `Core Components`, description: `Key elements and their functions` },
          { topic: `Practical Examples`, description: `Real-world applications and case studies` }
        ],
        prerequisites: [`Basic understanding of ${topic}`, 'Fundamental computer literacy'],
        estimatedTime: "3-4 hours",
        moduleContent: `1. Introduction and Overview\n2. Core Concepts and Principles\n3. Practical Applications\n4. Hands-on Exercises\n5. Assessment and Review`
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return detailedModules;
}

// Phase 4: Generate exercises and assessments for each module
async function generateModuleExercises(content, modules, topic, apiKey, provider) {
  const modulesWithExercises = [];

  for (const module of modules) {
    console.log(`Generating exercises for module: ${module.title}`);

    const exercisePrompt = `
For the module "${module.title}" in the "${topic}" course, create practical exercises and activities.

Module details:
- Objectives: ${module.objectives?.join(', ')}
- Concepts: ${module.concepts?.join(', ')}
- Topics: ${module.topics?.join(', ')}

Create 3-5 practical exercises/activities that help learners apply the concepts. Each exercise should include:
1. Exercise title
2. Description of what to do
3. Learning outcomes
4. Difficulty level (Beginner/Intermediate/Advanced)
5. Estimated completion time

Return in JSON format:
[
  {
    "title": "Exercise Title",
    "description": "What to do",
    "outcomes": ["Outcome 1", "Outcome 2"],
    "difficulty": "Intermediate",
    "estimatedTime": "30 minutes"
  }
]
`;

    const response = provider === 'groq' ?
      await evaluateWithGroq(exercisePrompt, apiKey) :
      await evaluateWithGemini(exercisePrompt, apiKey);

    try {
      const exercises = JSON.parse(response);
      modulesWithExercises.push({
        ...module,
        exercises: exercises
      });
    } catch (e) {
      console.log(`Failed to parse exercises for ${module.title}, using fallback`);
      modulesWithExercises.push({
        ...module,
        exercises: [{
          title: `Practice Exercise for ${module.title}`,
          description: `Complete practical exercises related to ${module.title.toLowerCase()}`,
          outcomes: [`Apply concepts from ${module.title.toLowerCase()}`],
          difficulty: "Intermediate",
          estimatedTime: "45 minutes"
        }]
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return modulesWithExercises;
}

// Fallback functions for each phase
function createFallbackSyllabus(topic) {
  return {
    courseTitle: `Introduction to ${topic}`,
    description: `A comprehensive course covering the fundamentals and advanced concepts of ${topic}.`,
    learningObjectives: [
      `Understand the core concepts of ${topic}`,
      `Apply ${topic} principles in practical scenarios`,
      `Develop problem-solving skills in ${topic}`
    ],
    prerequisites: [
      'Basic computer literacy',
      'High school level mathematics'
    ],
    moduleTopics: [
      { title: `Introduction to ${topic}`, description: 'Basic concepts and overview' },
      { title: `Core ${topic} Concepts`, description: 'Fundamental principles and theories' },
      { title: `Practical Applications`, description: 'Real-world usage and examples' },
      { title: `Advanced Topics`, description: 'Complex scenarios and optimization' }
    ],
    assessmentMethods: ['Quizzes', 'Projects', 'Final assessment'],
    additionalResources: ['Official documentation', 'Online tutorials', 'Practice platforms']
  };
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
