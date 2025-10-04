const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @route   POST api/ai/process
// @desc    Process scraped content to generate a structured course with modules and exercises
// @access  Public
router.post('/process', async (req, res) => {
  const { topic, resources, apiKey } = req.body;

  if (!topic || !resources) {
    return res.status(400).json({ msg: 'Please provide a topic and resources' });
  }

  if (!apiKey) {
    return res.status(400).json({ msg: 'Please provide an AI API key' });
  }

  try {
    console.log(`Generating course for topic: ${topic} with ${resources.length} resources`);

    // Detect API key type and use appropriate AI service
    const courseStructure = await generateCourseStructure(topic, resources, apiKey);

    // Return the AI-generated course
    res.json({
      topic,
      courseStructure,
      resourcesProcessed: resources.length,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('AI Processing Error:', err.message);
    res.status(500).json({
      msg: 'Server Error',
      error: err.message,
      details: 'Failed to generate course structure using AI'
    });
  }
});

// Helper function to prepare content for AI processing
function prepareContentForAI(topic, resources) {
  const processedResources = resources.map((resource, index) => {
    return `
RESOURCE ${index + 1}:
Title: ${resource.title}
Type: ${resource.type}
URL: ${resource.url}
Content: ${resource.content || resource.snippet || 'No content available'}

Key Learning Points:
${extractKeyPoints(resource.content || resource.snippet)}
`;
  }).join('\n---\n');

  return `
TOPIC: ${topic}

I have scraped the following learning resources. Please analyze this content and create a comprehensive, structured course.

RESOURCES:
${processedResources}

Please create a course structure with:
1. Multiple learning modules (3-6 modules)
2. Each module should have:
   - Clear learning objectives
   - 2-4 key concepts to learn
   - Practical exercises or assignments
   - Additional resources if needed

3. Make it progressive - from beginner to advanced
4. Include hands-on exercises where possible
5. Focus on practical, actionable learning

Return the response in this exact JSON format:
{
  "modules": [
    {
      "title": "Module Title",
      "duration": "X hours",
      "difficulty": "beginner|intermediate|advanced",
      "learningObjectives": ["Objective 1", "Objective 2"],
      "keyConcepts": ["Concept 1", "Concept 2"],
      "exercises": [
        {
          "title": "Exercise Title",
          "type": "coding|reading|writing|project",
          "description": "Detailed exercise description",
          "estimatedTime": "X minutes"
        }
      ],
      "resources": ["Resource Title 1", "Resource Title 2"]
    }
  ]
}
`;
}

// Helper function to extract key points from content
function extractKeyPoints(content) {
  if (!content) return "No key points available";

  // Simple extraction of bullet points, numbered lists, or sentences
  const sentences = content.split(/[.!?]+/).slice(0, 5);
  return sentences.map(s => s.trim()).filter(s => s.length > 20).join('; ');
}

// Generate course structure using user-provided API key
async function generateCourseStructure(topic, resources, apiKey) {
  try {
    // Detect API key type and use appropriate service
    if (apiKey.startsWith('sk-')) {
      // OpenAI API key
      return await generateWithOpenAI(topic, resources, apiKey);
    } else if (apiKey.length > 20) {
      // Assume Gemini API key
      return await generateWithGemini(topic, resources, apiKey);
    } else {
      throw new Error('Invalid API key format');
    }
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error('Failed to generate course structure');
  }
}

// Generate course structure using OpenAI
async function generateWithOpenAI(topic, resources, apiKey) {
  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const contentForAI = prepareContentForAI(topic, resources);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator. Create structured, practical courses with clear learning objectives and hands-on exercises."
        },
        {
          role: "user",
          content: contentForAI
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;

    // Try to parse as JSON first
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.log('OpenAI returned text instead of JSON, parsing manually');
      return parseTextResponse(aiResponse);
    }

  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate course structure with OpenAI');
  }
}

// Generate course structure using Gemini
async function generateWithGemini(topic, resources, apiKey) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const contentForAI = prepareContentForAI(topic, resources);

    const result = await model.generateContent(contentForAI);
    const response = await result.response;
    const aiResponse = response.text();

    // Try to parse as JSON first
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.log('Gemini returned text instead of JSON, parsing manually');
      return parseTextResponse(aiResponse);
    }

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate course structure with Gemini');
  }
}

// Fallback function to parse text response if JSON parsing fails
function parseTextResponse(textResponse) {
  // This is a simple fallback - in production, you'd want more sophisticated parsing
  const modules = [];

  // Split by module indicators (this is a basic implementation)
  const moduleMatches = textResponse.match(/Module \d+:.*?(?=Module \d+:|$)/gs);

  if (moduleMatches) {
    moduleMatches.forEach((moduleText, index) => {
      modules.push({
        title: `Module ${index + 1}`,
        duration: "2-3 hours",
        difficulty: "intermediate",
        learningObjectives: ["Learn key concepts", "Practice implementation"],
        keyConcepts: ["Core concept 1", "Core concept 2"],
        exercises: [
          {
            title: "Practice Exercise",
            type: "coding",
            description: "Apply what you've learned",
            estimatedTime: "30 minutes"
          }
        ],
        resources: [`Resource ${index + 1}`]
      });
    });
  }

  return { modules };
}

module.exports = router;
