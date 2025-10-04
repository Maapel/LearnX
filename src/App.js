import React, { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [course, setCourse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_BASE_URL = '/api';

      // Step 1: Scrape learning resources
      const scrapeResponse = await axios.post(`${API_BASE_URL}/scrape`, {
        topic: topic
      });

      console.log('Scraping response:', scrapeResponse.data);

      // Check if we have valid resources from scraping
      if (!scrapeResponse.data.resources || scrapeResponse.data.resources.length === 0) {
        console.log('No resources found, using fallback');
        setCourse({
          topic: topic,
          outline: {
            modules: [{
              title: 'Getting Started',
              resources: [{
                title: `Learning resources for ${topic}`,
                link: '#',
                snippet: 'No resources found. Try a different topic or check your search configuration.',
                type: 'article'
              }]
            }]
          }
        });
        return;
      }

      // Step 2: Process with AI to generate course structure (only if API key is provided)
      if (apiKey && apiKey.trim()) {
        try {
          const aiResponse = await axios.post(`${API_BASE_URL}/ai/process`, {
            topic: topic,
            resources: scrapeResponse.data.resources,
            apiKey: apiKey // Include user's API key
          });

          console.log('AI processing response:', aiResponse.data);

          // Use the AI-generated course structure
          const aiData = aiResponse.data;

          setCourse({
            topic: aiData.topic,
            outline: {
              modules: aiData.courseStructure.modules.map(module => ({
                title: module.title,
                duration: module.duration,
                difficulty: module.difficulty,
                learningObjectives: module.learningObjectives,
                keyConcepts: module.keyConcepts,
                exercises: module.exercises,
                resources: module.resources
              }))
            },
            resourcesProcessed: aiData.resourcesProcessed,
            generatedAt: aiData.generatedAt
          });
        } catch (aiError) {
          console.error('AI processing failed, falling back to organized resources:', aiError);
          // Fall back to organized scraped resources if AI fails
          setCourse({
            topic: scrapeResponse.data.topic,
            outline: {
              modules: scrapeResponse.data.modules.map(module => ({
                title: module.title,
                resources: module.resources.map(resource => ({
                  title: resource.title,
                  link: resource.url,
                  snippet: resource.content || resource.snippet,
                  type: resource.type,
                  scraped: resource.scraped
                }))
              }))
            }
          });
        }
      } else {
        // No API key provided, use organized scraped resources
        console.log('No API key provided, using organized resources');
        setCourse({
          topic: scrapeResponse.data.topic,
          outline: {
            modules: scrapeResponse.data.modules.map(module => ({
              title: module.title,
              resources: module.resources.map(resource => ({
                title: resource.title,
                link: resource.url,
                snippet: resource.content || resource.snippet,
                type: resource.type,
                scraped: resource.scraped
              }))
            }))
          }
        });
      }
    } catch (err) {
      console.error('Course generation error:', err);
      setCourse({
        topic: topic,
        outline: {
          modules: [{
            title: 'Error',
            resources: [{
              title: 'Failed to generate course',
              link: '#',
              snippet: err.response?.data?.msg || err.message,
              type: 'error'
            }]
          }]
        }
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>LearnX</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic"
          />
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your AI API key (OpenAI/Gemini)"
          />
          <button type="submit">Generate Course</button>
        </form>
        {course && course.outline && course.outline.modules && (
          <div className="course-outline">
            <h2>{course.topic}</h2>
            {course.resourcesProcessed && (
              <p className="course-meta">
                Generated from {course.resourcesProcessed} learning resources
                {course.generatedAt && ` • ${new Date(course.generatedAt).toLocaleDateString()}`}
              </p>
            )}

            {course.outline.modules.map((module, index) => (
              <div key={index} className="module">
                <div className="module-header">
                  <h3>{module.title}</h3>
                  <div className="module-badges">
                    <span className={`difficulty-badge ${module.difficulty}`}>
                      {module.difficulty}
                    </span>
                    {module.duration && (
                      <span className="duration-badge">
                        {module.duration}
                      </span>
                    )}
                  </div>
                </div>

                {module.learningObjectives && module.learningObjectives.length > 0 && (
                  <div className="module-section">
                    <h4>Learning Objectives</h4>
                    <ul className="learning-objectives">
                      {module.learningObjectives.map((objective, i) => (
                        <li key={i}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {module.keyConcepts && module.keyConcepts.length > 0 && (
                  <div className="module-section">
                    <h4>Key Concepts</h4>
                    <div className="key-concepts">
                      {module.keyConcepts.map((concept, i) => (
                        <span key={i} className="concept-tag">{concept}</span>
                      ))}
                    </div>
                  </div>
                )}

                {module.exercises && module.exercises.length > 0 && (
                  <div className="module-section">
                    <h4>Exercises</h4>
                    <div className="exercises">
                      {module.exercises.map((exercise, i) => (
                        <div key={i} className="exercise">
                          <div className="exercise-header">
                            <h5>{exercise.title}</h5>
                            <div className="exercise-badges">
                              <span className={`exercise-type ${exercise.type}`}>
                                {exercise.type}
                              </span>
                              {exercise.estimatedTime && (
                                <span className="exercise-time">
                                  {exercise.estimatedTime}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="exercise-description">{exercise.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {module.resources && module.resources.length > 0 && (
                  <div className="module-section">
                    <h4>Resources</h4>
                    <ul className="module-resources">
                      {module.resources.map((resource, i) => (
                        <li key={i} className="resource-item">
                          <a href="#" target="_blank" rel="noopener noreferrer">
                            {resource}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
