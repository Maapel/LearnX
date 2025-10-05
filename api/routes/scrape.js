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

// Helper function to generate course structure with sophisticated workflow
async function generateCourseFromSource(mostAuthenticSource, topic, apiKey, provider) {
  try {
    console.log('Starting sophisticated course generation workflow...');

    // Phase 1: Get initial reference content
    console.log('Phase 1: Getting initial reference content...');
    const initialContent = await scrapeWebpageContent(mostAuthenticSource.url);

    if (!initialContent || initialContent.length < 100) {
      console.log('Insufficient initial content, using fallback');
      return createFallbackCourseStructure(topic);
    }

    // Phase 2: Analyze content and decide module structure
    console.log('Phase 2: Analyzing content and deciding module structure...');
    const courseStructure = await analyzeContentAndCreateModules(initialContent, topic, apiKey, provider);

    // Phase 3: For each module, get specific references and generate content
    console.log('Phase 3: Processing each module individually...');
    const modulesWithContent = [];

    for (const module of courseStructure.modules) {
      console.log(`Processing module: ${module.title}`);

      // Get specific references for this module
      const moduleReferences = await getModuleSpecificReferences(module.title, module.description, topic, apiKey, provider);

      // Generate comprehensive content for this module
      const moduleContent = await generateModuleContent(module.title, module.description, moduleReferences, topic, apiKey, provider);

      modulesWithContent.push({
        ...module,
        content: moduleContent,
        references: moduleReferences
      });

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Phase 4: Compile final course
    console.log('Phase 4: Compiling final course structure...');
    const finalCourse = {
      courseTitle: courseStructure.courseTitle,
      description: courseStructure.description,
      learningObjectives: courseStructure.learningObjectives,
      prerequisites: courseStructure.prerequisites,
      modules: modulesWithContent,
      assessmentMethods: courseStructure.assessmentMethods,
      additionalResources: courseStructure.additionalResources,
      generationPhases: {
        phase1: 'Initial reference content obtained',
        phase2: 'Course structure and modules decided',
        phase3: 'Each module processed individually with specific references',
        phase4: 'Final course compiled with all content and references'
      }
    };

    console.log('Sophisticated course generation completed successfully');
    return finalCourse;

  } catch (error) {
    console.error('Error in sophisticated course generation:', error);
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
    console.log(`Generating comprehensive learning content for module: ${moduleTopic.title}`);

    const modulePrompt = `
You are creating a complete, self-contained learning module for an online course about "${topic}". This module should contain ALL the written content, explanations, and materials needed for students to learn the topic without external resources.

Module Topic: "${moduleTopic.title}"
Description: ${moduleTopic.description}

Based on this reference content:
${content.substring(0, 4000)}

Create a comprehensive learning module with the following structure:

1. **Module Overview**: Detailed introduction (4-5 paragraphs) explaining concepts, importance, and what students will achieve

2. **Learning Objectives**: 5-7 specific, measurable learning objectives

3. **Prerequisites**: Required background knowledge

4. **Estimated Time**: Realistic completion time

5. **Learning Sections**: Create 4-6 detailed learning sections. Each section should include:
   - Section title
   - Comprehensive written explanation (300-500 words each)
   - Key concepts covered
   - Code examples (if applicable to ${topic})
   - Important notes or tips

6. **Practice Exercises**: 3-5 hands-on exercises for each section, including:
   - Exercise description
   - Step-by-step instructions
   - Expected outcomes
   - Difficulty level
   - Time estimate

7. **Module Quiz**: 5-8 multiple choice or short answer questions to test understanding

8. **Summary & Key Takeaways**: Comprehensive summary of the module

Return in this exact JSON format:
{
  "overview": "Detailed 4-5 paragraph introduction...",
  "objectives": ["Objective 1", "Objective 2", ...],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "estimatedTime": "X hours",
  "learningSections": [
    {
      "title": "Section Title",
      "content": "Comprehensive written explanation (300-500 words)...",
      "keyConcepts": ["Concept 1", "Concept 2"],
      "codeExamples": ["Example code here"],
      "tips": ["Important tip 1", "Tip 2"]
    }
  ],
  "exercises": [
    {
      "title": "Exercise Title",
      "description": "Detailed exercise description...",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedOutcome": "What should happen...",
      "difficulty": "Beginner/Intermediate/Advanced",
      "timeEstimate": "X minutes"
    }
  ],
  "quiz": [
    {
      "question": "Question text?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this is correct..."
    }
  ],
  "summary": "Comprehensive module summary...",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
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
        overview: `Welcome to ${moduleTopic.title}! This comprehensive module will guide you through all the essential concepts and practical applications of ${moduleTopic.title.toLowerCase()} in ${topic}. You'll learn step-by-step through detailed explanations, real-world examples, and hands-on exercises. By the end of this module, you'll have a solid foundation and practical experience that you can build upon in advanced topics.`,
        objectives: [
          `Master the fundamental concepts of ${moduleTopic.title.toLowerCase()}`,
          `Apply ${moduleTopic.title.toLowerCase()} principles in practical scenarios`,
          `Understand the theoretical foundations and real-world applications`,
          `Develop problem-solving skills related to ${moduleTopic.title.toLowerCase()}`,
          `Create working examples and solutions`
        ],
        prerequisites: [`Basic understanding of ${topic}`, 'Fundamental computer literacy'],
        estimatedTime: "4-6 hours",
        learningSections: [
          {
            title: `Introduction to ${moduleTopic.title}`,
            content: `Let's begin our journey into ${moduleTopic.title.toLowerCase()}. This section provides a comprehensive overview of the core concepts and principles that form the foundation of this topic. We'll explore the fundamental ideas, understand their importance in the broader context of ${topic}, and see how these concepts connect to real-world applications.`,
            keyConcepts: ['Core principles', 'Fundamental concepts', 'Basic terminology'],
            codeExamples: ['# Basic example code'],
            tips: ['Focus on understanding the concepts', 'Practice regularly']
          },
          {
            title: `Core Components and Architecture`,
            content: `Now we'll dive deep into the architecture and components that make ${moduleTopic.title.toLowerCase()} work. Understanding these building blocks is crucial for mastering the topic and applying it effectively in your projects.`,
            keyConcepts: ['Architecture patterns', 'Component interactions', 'Design principles'],
            codeExamples: ['# Architecture example'],
            tips: ['Draw diagrams to visualize relationships', 'Study real-world implementations']
          }
        ],
        exercises: [
          {
            title: `Basic ${moduleTopic.title} Exercise`,
            description: `Apply the concepts learned in this module to create a simple working example.`,
            steps: ['Set up your development environment', 'Implement the basic structure', 'Test your implementation', 'Debug and refine'],
            expectedOutcome: 'A working implementation that demonstrates the core concepts',
            difficulty: 'Beginner',
            timeEstimate: '45 minutes'
          }
        ],
        quiz: [
          {
            question: `What is the primary purpose of ${moduleTopic.title.toLowerCase()} in ${topic}?`,
            options: ['A) To complicate development', 'B) To provide structure and organization', 'C) To increase code length', 'D) To make debugging harder'],
            correctAnswer: 'B',
            explanation: 'The primary purpose is to provide structure and organization to development processes.'
          }
        ],
        summary: `Congratulations on completing ${moduleTopic.title}! You've learned the essential concepts, practiced with hands-on exercises, and tested your understanding. This knowledge forms a solid foundation for advanced topics in ${topic}.`,
        keyTakeaways: [
          `Mastered the core concepts of ${moduleTopic.title.toLowerCase()}`,
          'Applied theoretical knowledge in practical exercises',
          'Developed problem-solving skills',
          'Gained confidence in implementing solutions'
        ]
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay for comprehensive content
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

// Phase 2: Analyze content and create module structure
async function analyzeContentAndCreateModules(content, topic, apiKey, provider) {
  const analysisPrompt = `
You are an expert curriculum designer. Analyze the following content about "${topic}" and create a comprehensive course structure.

Content to analyze:
${content.substring(0, 8000)}

Based on this content, create a complete course structure with:

1. **Course Title**: An engaging, descriptive title
2. **Course Description**: 3-4 sentences describing what students will learn
3. **Learning Objectives**: 4-6 main course objectives
4. **Prerequisites**: Required background knowledge
5. **Modules**: Decide on the optimal number of modules (4-8) and for each module provide:
   - Module title
   - Module description (2-3 sentences)
   - Key topics that should be covered in this module
   - Why this module is important in the learning progression

6. **Assessment Methods**: How students will be evaluated
7. **Additional Resources**: Recommended external resources

Return in this JSON format:
{
  "courseTitle": "Complete Course Title",
  "description": "Course description...",
  "learningObjectives": ["Objective 1", "Objective 2", ...],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description...",
      "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
      "importance": "Why this module matters..."
    }
  ],
  "assessmentMethods": ["Method 1", "Method 2"],
  "additionalResources": ["Resource 1", "Resource 2"]
}
`;

  const response = provider === 'groq' ?
    await evaluateWithGroq(analysisPrompt, apiKey) :
    await evaluateWithGemini(analysisPrompt, apiKey);

  try {
    return JSON.parse(response);
  } catch (e) {
    console.log('Course structure analysis failed, using fallback');
    return createFallbackCourseStructure(topic);
  }
}

// Phase 3a: Get specific references for each module
async function getModuleSpecificReferences(moduleTitle, moduleDescription, mainTopic, apiKey, provider) {
  const referencePrompt = `
Find the best online resources and references specifically for learning "${moduleTitle}" in the context of "${mainTopic}".

Module Description: ${moduleDescription}

Search for and recommend 3-5 high-quality references that would be perfect for learning this specific module. Each reference should include:

1. **Title**: Clear, descriptive title
2. **URL**: Direct link to the resource
3. **Type**: (tutorial, documentation, article, video, course, etc.)
4. **Description**: Why this resource is valuable for this module
5. **Relevance**: How it specifically helps with this module's topics

Return in this JSON format:
[
  {
    "title": "Resource Title",
    "url": "https://example.com",
    "type": "tutorial",
    "description": "Why this resource is valuable...",
    "relevance": "How it helps with this module..."
  }
]
`;

  const response = provider === 'groq' ?
    await evaluateWithGroq(referencePrompt, apiKey) :
    await evaluateWithGemini(referencePrompt, apiKey);

  try {
    const references = JSON.parse(response);
    return references;
  } catch (e) {
    console.log(`Failed to get references for ${moduleTitle}, using fallback`);
    return [
      {
        title: `Introduction to ${moduleTitle}`,
        url: `https://example.com/${moduleTitle.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'tutorial',
        description: `Comprehensive guide to ${moduleTitle} concepts and applications.`,
        relevance: `Provides foundational knowledge essential for this module.`
      }
    ];
  }
}

// Phase 3b: Generate comprehensive content for each module
async function generateModuleContent(moduleTitle, moduleDescription, references, mainTopic, apiKey, provider) {
  // Combine reference information
  const referenceText = references.map(ref =>
    `${ref.title} (${ref.type}): ${ref.description} - ${ref.relevance}`
  ).join('\n');

  const contentPrompt = `
Create comprehensive, self-contained learning content for the module "${moduleTitle}" in the "${mainTopic}" course.

Module Description: ${moduleDescription}

Available References:
${referenceText}

Create a complete learning module with the following structure:

1. **Module Overview**: Detailed introduction (4-5 paragraphs) explaining what students will learn and why it's important

2. **Learning Objectives**: 5-7 specific, measurable objectives for this module

3. **Prerequisites**: What students should know before starting

4. **Estimated Time**: Realistic completion time

5. **Learning Sections**: Create 4-6 detailed sections. Each section must include:
   - Section title
   - Comprehensive written explanation (400-600 words each)
   - Key concepts covered
   - Code examples (if applicable to ${mainTopic})
   - Important tips and best practices
   - Common mistakes to avoid

6. **Practice Exercises**: 3-5 hands-on exercises with:
   - Exercise title and detailed description
   - Step-by-step instructions
   - Expected outcomes
   - Difficulty level and time estimate
   - Learning objectives achieved

7. **Module Quiz**: 6-10 multiple choice questions with explanations

8. **Summary & Key Takeaways**: Comprehensive summary

Return in this JSON format:
{
  "overview": "Detailed 4-5 paragraph introduction...",
  "objectives": ["Objective 1", "Objective 2", ...],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "estimatedTime": "X hours",
  "learningSections": [
    {
      "title": "Section Title",
      "content": "Comprehensive 400-600 word explanation...",
      "keyConcepts": ["Concept 1", "Concept 2"],
      "codeExamples": ["Code example here"],
      "tips": ["Important tip 1", "Best practice"],
      "commonMistakes": ["Mistake to avoid 1", "Mistake to avoid 2"]
    }
  ],
  "exercises": [
    {
      "title": "Exercise Title",
      "description": "Detailed description...",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedOutcome": "What should happen...",
      "difficulty": "Beginner/Intermediate/Advanced",
      "timeEstimate": "X minutes",
      "learningObjectives": ["What you learn from this exercise"]
    }
  ],
  "quiz": [
    {
      "question": "Question text?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this is correct..."
    }
  ],
  "summary": "Comprehensive module summary...",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}
`;

  const response = provider === 'groq' ?
    await evaluateWithGroq(contentPrompt, apiKey) :
    await evaluateWithGemini(contentPrompt, apiKey);

  try {
    const moduleContent = JSON.parse(response);
    return moduleContent;
  } catch (e) {
    console.log(`Failed to generate content for ${moduleTitle}, using fallback`);
    return {
      overview: `Welcome to ${moduleTitle}! This module explores ${moduleDescription}. Through comprehensive explanations, practical examples, and hands-on exercises, you'll gain a deep understanding of these important concepts.`,
      objectives: [
        `Understand the core concepts of ${moduleTitle}`,
        `Apply ${moduleTitle} principles in practice`,
        `Identify best practices and common patterns`,
        `Solve real-world problems using ${moduleTitle}`
      ],
      prerequisites: [`Basic knowledge of ${mainTopic}`],
      estimatedTime: "3-4 hours",
      learningSections: [
        {
          title: `Understanding ${moduleTitle}`,
          content: `This section provides a comprehensive introduction to ${moduleTitle}. We begin by exploring the fundamental concepts and principles that form the foundation of this topic. Understanding these core ideas is crucial for building more advanced knowledge and skills.`,
          keyConcepts: ['Core principles', 'Fundamental concepts'],
          codeExamples: ['# Example code'],
          tips: ['Practice regularly', 'Take notes'],
          commonMistakes: ['Skipping fundamentals', 'Not testing code']
        }
      ],
      exercises: [
        {
          title: `Practice ${moduleTitle}`,
          description: `Apply the concepts learned in this module.`,
          steps: ['Review the concepts', 'Try the examples', 'Create your own version'],
          expectedOutcome: 'Working implementation demonstrating understanding',
          difficulty: 'Intermediate',
          timeEstimate: '60 minutes',
          learningObjectives: ['Apply theoretical knowledge', 'Practice implementation']
        }
      ],
      quiz: [
        {
          question: `What is the main purpose of ${moduleTitle}?`,
          options: ['A) To complicate things', 'B) To provide structure and understanding', 'C) To increase complexity', 'D) To make development harder'],
          correctAnswer: 'B',
          explanation: 'The main purpose is to provide structure and understanding to help with effective implementation.'
        }
      ],
      summary: `Congratulations on completing ${moduleTitle}! You've gained valuable knowledge and skills that will serve you well in your ${mainTopic} journey.`,
      keyTakeaways: [
        `Mastered ${moduleTitle} concepts`,
        'Applied knowledge in practice',
        'Developed problem-solving skills'
      ]
    };
  }
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
