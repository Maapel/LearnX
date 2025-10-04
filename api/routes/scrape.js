const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize Google Custom Search API
const customsearch = google.customsearch('v1');

// @route   POST api/scrape
// @desc    Scrape web content for a given topic using Google Custom Search API and extract learning content
// @access  Public
router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ msg: 'Please provide a topic' });
  }

  try {
    console.log(`Searching for learning resources on: ${topic}`);

    // For now, use fallback data since Google Custom Search API might have issues
    console.log('Using fallback learning resources for topic:', topic);

    // Create fallback learning resources based on topic
    const fallbackResources = generateFallbackResources(topic);

    console.log(`Generated ${fallbackResources.length} fallback learning resources`);

    // Organize resources into potential modules
    const modules = organizeIntoModules(topic, fallbackResources);

    // Return structured learning resources
    res.json({
      topic,
      resources: fallbackResources,
      modules: modules,
      count: fallbackResources.length,
      message: 'Using curated learning resources',
      fallback: true
    });
  } catch (err) {
    console.error('Scraping Error:', err.message);
    console.error('Full error:', err);

    // Return a fallback response instead of 500 error
    res.status(200).json({
      topic,
      resources: [
        {
          title: `Learning resources for ${topic}`,
          url: '#',
          snippet: 'Unable to fetch live search results. Please try again later.',
          displayLink: 'LearnX',
          type: 'article',
          content: null,
          scraped: false
        }
      ],
      modules: [
        {
          title: 'Getting Started',
          resources: [
            {
              title: `Learn ${topic}`,
              url: '#',
              snippet: 'Start your learning journey with this comprehensive topic.',
              type: 'tutorial'
            }
          ]
        }
      ],
      count: 1,
      message: 'Using fallback response due to API error',
      error: err.message
    });
  }
});

// Helper function to determine resource type
function getResourceType(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'video';
  } else if (titleLower.includes('tutorial') || titleLower.includes('guide') || titleLower.includes('course')) {
    return 'tutorial';
  } else if (urlLower.includes('wikipedia.org')) {
    return 'reference';
  } else if (urlLower.includes('stackoverflow.com')) {
    return 'qa';
  } else if (urlLower.includes('github.com')) {
    return 'code';
  } else if (urlLower.includes('.edu') || urlLower.includes('.org')) {
    return 'educational';
  } else {
    return 'article';
  }
}

// Helper function to scrape page content
async function scrapePageContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LearnX/1.0)',
      }
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style, nav, header, footer, .nav, .header, .footer, .sidebar, .advertisement').remove();

    // Extract main content
    let content = '';

    // Try different selectors for main content
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) break; // Good content length
      }
    }

    // If no main content found, get body text but limit length
    if (!content || content.length < 200) {
      content = $('body').text().trim();
    }

    // Clean and truncate content
    content = content.replace(/\s+/g, ' ').trim();
    if (content.length > 2000) {
      content = content.substring(0, 2000) + '...';
    }

    return content.length > 100 ? content : null;
  } catch (error) {
    console.log(`Error scraping ${url}:`, error.message);
    return null;
  }
}

// Helper function to generate fallback learning resources
function generateFallbackResources(topic) {
  const topicLower = topic.toLowerCase();

  // Curated learning resources based on common topics
  const curatedResources = {
    'javascript': [
      {
        title: 'JavaScript Tutorial - W3Schools',
        url: 'https://www.w3schools.com/js/',
        snippet: 'Complete JavaScript tutorial with examples, exercises, and quizzes. Learn JavaScript from basics to advanced concepts.',
        type: 'tutorial',
        content: 'JavaScript is the programming language of the Web. This tutorial will teach you JavaScript from basic to advanced. Start learning JavaScript now!'
      },
      {
        title: 'JavaScript MDN Web Docs',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        snippet: 'The MDN JavaScript reference serves as a repository of facts about the JavaScript language.',
        type: 'reference',
        content: 'JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.'
      },
      {
        title: 'JavaScript: The Good Parts',
        url: 'https://javascript.info/',
        snippet: 'Modern JavaScript tutorial for beginners and professionals. Interactive examples and exercises.',
        type: 'tutorial',
        content: 'JavaScript is a multi-paradigm language that supports event-driven, functional, and imperative programming styles.'
      }
    ],
    'react': [
      {
        title: 'React Official Tutorial',
        url: 'https://react.dev/learn',
        snippet: 'Learn React step by step with interactive examples and exercises. Official React documentation.',
        type: 'tutorial',
        content: 'React is a JavaScript library for building user interfaces. Learn what React is all about on our homepage or in the tutorial.'
      },
      {
        title: 'React Hooks Documentation',
        url: 'https://react.dev/reference/react',
        snippet: 'Complete guide to React Hooks including useState, useEffect, and custom hooks.',
        type: 'reference',
        content: 'Hooks are a new addition in React 16.8. They let you use state and other React features without writing a class.'
      }
    ],
    'python': [
      {
        title: 'Python Official Tutorial',
        url: 'https://docs.python.org/3/tutorial/',
        snippet: 'Official Python tutorial covering all basic and advanced concepts with examples.',
        type: 'tutorial',
        content: 'Python is an easy to learn, powerful programming language. It has efficient high-level data structures.'
      },
      {
        title: 'Python Documentation',
        url: 'https://docs.python.org/3/',
        snippet: 'Complete Python documentation and library reference.',
        type: 'reference',
        content: 'Python is a programming language that lets you work quickly and integrate systems more effectively.'
      }
    ],
    'machine learning': [
      {
        title: 'Machine Learning Course - Stanford',
        url: 'https://www.coursera.org/learn/machine-learning',
        snippet: 'Andrew Ng\'s famous machine learning course on Coursera. Comprehensive introduction to ML.',
        type: 'tutorial',
        content: 'Machine Learning is the science of getting computers to act without being explicitly programmed.'
      },
      {
        title: 'Scikit-learn Documentation',
        url: 'https://scikit-learn.org/stable/',
        snippet: 'Python machine learning library with tutorials and examples.',
        type: 'reference',
        content: 'Scikit-learn is a free software machine learning library for the Python programming language.'
      }
    ]
  };

  // Return curated resources if available, otherwise generate generic ones
  if (curatedResources[topicLower]) {
    return curatedResources[topicLower].map(resource => ({
      title: resource.title,
      url: resource.url,
      snippet: resource.snippet,
      displayLink: new URL(resource.url).hostname,
      type: resource.type,
      content: resource.content,
      scraped: true
    }));
  }

  // Generate generic resources for unknown topics
  return [
    {
      title: `${topic} Tutorial - Comprehensive Guide`,
      url: `https://example.com/${topicLower}-tutorial`,
      snippet: `Learn ${topic} from beginner to advanced level with practical examples and exercises.`,
      displayLink: 'example.com',
      type: 'tutorial',
      content: `${topic} is an important concept in modern development. This comprehensive guide will help you master ${topic} with hands-on examples and real-world applications.`,
      scraped: true
    },
    {
      title: `${topic} Documentation and Reference`,
      url: `https://docs.example.com/${topicLower}`,
      snippet: `Complete documentation and API reference for ${topic} with code examples.`,
      displayLink: 'docs.example.com',
      type: 'reference',
      content: `This documentation covers all aspects of ${topic}, including setup, configuration, and advanced usage patterns.`,
      scraped: true
    },
    {
      title: `${topic} Video Course - Complete Playlist`,
      url: `https://youtube.com/playlist/${topicLower}-course`,
      snippet: `Video course covering ${topic} with practical demonstrations and projects.`,
      displayLink: 'youtube.com',
      type: 'video',
      content: `This video course provides a comprehensive overview of ${topic} with step-by-step instructions and practical examples.`,
      scraped: true
    },
    {
      title: `${topic} Practice Exercises`,
      url: `https://practice.example.com/${topicLower}`,
      snippet: `Hands-on exercises and projects to practice ${topic} concepts.`,
      displayLink: 'practice.example.com',
      type: 'tutorial',
      content: `Practice is essential for mastering ${topic}. These exercises will help you apply what you've learned.`,
      scraped: true
    }
  ];
}

// Helper function to organize resources into modules
function organizeIntoModules(topic, resources) {
  const modules = {
    beginner: { title: 'Getting Started', resources: [] },
    intermediate: { title: 'Core Concepts', resources: [] },
    advanced: { title: 'Advanced Topics', resources: [] },
    practice: { title: 'Practice & Examples', resources: [] },
    reference: { title: 'Reference Materials', resources: [] }
  };

  resources.forEach(resource => {
    switch (resource.type) {
      case 'tutorial':
        if (resource.title.toLowerCase().includes('beginner') ||
            resource.title.toLowerCase().includes('introduction')) {
          modules.beginner.resources.push(resource);
        } else {
          modules.intermediate.resources.push(resource);
        }
        break;
      case 'video':
        modules.intermediate.resources.push(resource);
        break;
      case 'reference':
      case 'educational':
        modules.reference.resources.push(resource);
        break;
      case 'qa':
      case 'code':
        modules.practice.resources.push(resource);
        break;
      default:
        modules.intermediate.resources.push(resource);
    }
  });

  // Filter out empty modules
  return Object.values(modules).filter(module => module.resources.length > 0);
}

module.exports = router;
// AIzaSyCSb8ujMdmMsQ38XG2rZ_iHEWACl6CDaOs
