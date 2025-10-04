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

    console.log('Google Custom Search API Response:', response.data);

    const resources = [];
    if (response.data.items) {
      for (const item of response.data.items) {
        const resource = {
          title: item.title,
          url: item.link,
          snippet: item.snippet || item.displayLink,
          displayLink: item.displayLink,
          type: getResourceType(item.link, item.title),
          content: null, // Will be filled by scraping
          scraped: false
        };

        // Try to scrape actual content from the page
        try {
          const scrapedContent = await scrapePageContent(item.link);
          if (scrapedContent) {
            resource.content = scrapedContent;
            resource.scraped = true;
          }
        } catch (scrapeError) {
          console.log(`Failed to scrape ${item.link}:`, scrapeError.message);
        }

        resources.push(resource);
      }
    }

    console.log(`Found ${resources.length} learning resources`);

    // Organize resources into potential modules
    const modules = organizeIntoModules(topic, resources);

    // Return structured learning resources
    res.json({
      topic,
      resources: resources,
      modules: modules,
      count: resources.length,
      searchInformation: response.data.searchInformation
    });
  } catch (err) {
    console.error('Scraping Error:', err.message);
    res.status(500).json({
      msg: 'Server Error',
      error: err.message,
      details: 'Failed to search or scrape learning resources'
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
