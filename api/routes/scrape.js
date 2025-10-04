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

    // Create learning-focused search query
    const learningQuery = `${topic} tutorial OR guide OR course OR documentation OR "step by step" site:edu OR site:org OR site:dev`;

    // Use Google Custom Search API with learning-focused query
    const response = await customsearch.cse.list({
      cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
      q: learningQuery,
      auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      num: 8, // Increased to 8 for better content variety
      safe: 'active', // Filter explicit content
    });

    console.log('Google Custom Search API Response received');

    // Check if we got a valid response
    if (!response.data || !response.data.items) {
      console.log('No search results found, returning fallback data');
      return res.json({
        topic,
        resources: [],
        modules: [],
        count: 0,
        message: 'No search results found'
      });
    }

    console.log('Google Custom Search API Response:', response.data);

    const resources = [];
    for (const item of response.data.items) {
      try {
        const resource = {
          title: item.title || 'Untitled',
          url: item.link || '',
          snippet: item.snippet || item.displayLink || 'No description available',
          displayLink: item.displayLink || '',
          type: getResourceType(item.link || '', item.title || ''),
          content: null,
          scraped: false
        };

        // Try to scrape actual content from the page (with error handling)
        try {
          const scrapedContent = await scrapePageContent(item.link);
          if (scrapedContent) {
            resource.content = scrapedContent;
            resource.scraped = true;
          }
        } catch (scrapeError) {
          console.log(`Failed to scrape ${item.link}:`, scrapeError.message);
          // Continue without scraped content
        }

        resources.push(resource);
      } catch (itemError) {
        console.log('Error processing item:', itemError.message);
        // Continue with next item
      }
    }

    console.log(`Successfully processed ${resources.length} learning resources`);

    // Organize resources into potential modules
    const modules = organizeIntoModules(topic, resources);

    // Return structured learning resources
    res.json({
      topic,
      resources: resources,
      modules: modules,
      count: resources.length,
      searchInformation: response.data.searchInformation || {}
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
