import React, { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [evaluateAuthenticity, setEvaluateAuthenticity] = useState(false);
  const [course, setCourse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_BASE_URL = '/api';

      // Call the scraping endpoint
      const requestData = {
        topic: topic
      };

      // Add authenticity evaluation if enabled and API key provided
      if (evaluateAuthenticity && apiKey.trim()) {
        requestData.evaluateAuthenticity = true;
        requestData.apiKey = apiKey.trim();
      }

      const response = await axios.post(`${API_BASE_URL}/scrape`, requestData);

      console.log('Scraping response:', response.data);

      // Handle the response data (content + search results format)
      const data = response.data;

      if (data.content) {
        // New format with extracted course content
        setCourse({
          topic: data.topic,
          content: data.content,
          searchResults: data.searchResults || [],
          count: data.count || 0,
          fallback: data.fallback || false,
          mostAuthenticSource: data.mostAuthenticSource
        });
      } else if (data.links) {
        // Old format with links array
        setCourse({
          topic: data.topic,
          outline: {
            modules: [{
              title: 'Learning Resources',
              resources: data.links.map(link => ({
                title: link.title,
                link: link.link,
                snippet: link.snippet
              }))
            }]
          }
        });
      } else {
        // Fallback for unknown format
        setCourse({
          topic: data.topic || topic,
          content: `Course content for ${topic} - format unknown`,
          searchResults: [],
          count: 0,
          fallback: true
        });
      }
    } catch (err) {
      console.error('Scraping error:', err);
      setCourse({
        topic: topic,
        outline: {
          modules: [{
            title: 'Error',
            resources: [{
              title: 'Failed to fetch resources',
              link: '#',
              snippet: err.response?.data?.msg || err.message
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

          <div className="authenticity-controls">
            <label>
              <input
                type="checkbox"
                checked={evaluateAuthenticity}
                onChange={(e) => setEvaluateAuthenticity(e.target.checked)}
              />
              Evaluate source authenticity (requires Gemini API key)
            </label>

            {evaluateAuthenticity && (
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
              />
            )}
          </div>

          <button type="submit">Generate Course</button>
        </form>
        {course && (
          <div className="course-outline">
            <h2>{course.topic}</h2>

            {course.content && (
              <>
                <div className="course-content">
                  <h3>Course Content</h3>
                  <div className="content-text">
                    {course.content.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>

                {course.searchResults && course.searchResults.length > 0 && (
                  <div className="search-results">
                    <h3>Search Results ({course.count})</h3>
                    <ul>
                      {course.searchResults.map((result, index) => (
                        <li key={index} className="search-result-item">
                          <div className="result-header">
                            <a href={result.url} target="_blank" rel="noopener noreferrer">
                              {result.title}
                            </a>
                            <span className="result-domain">{result.displayLink}</span>
                          </div>
                          <p className="result-snippet">{result.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.mostAuthenticSource && (
                  <div className="most-authentic-source">
                    <h3>🎯 Most Authentic Source</h3>
                    <div className="authentic-source-card">
                      <div className="authentic-source-header">
                        <a
                          href={course.mostAuthenticSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="authentic-source-title"
                        >
                          {course.mostAuthenticSource.title}
                        </a>
                        <span className="authentic-source-domain">
                          {course.mostAuthenticSource.domain}
                        </span>
                      </div>
                      <p className="authentic-source-reasoning">
                        {course.mostAuthenticSource.reasoning}
                      </p>
                    </div>
                  </div>
                )}

                {course.fallback && (
                  <div className="fallback-notice">
                    <p>⚠️ Using fallback content - Live search results may be temporarily unavailable</p>
                  </div>
                )}
              </>
            )}

            {course.outline && course.outline.modules && (
              <>
                {course.outline.modules.map((module, index) => (
                  <div key={index}>
                    <h3>{module.title}</h3>
                    <ul>
                      {module.resources.map((resource, i) => (
                        <li key={i}>
                          <a href={resource.link} target="_blank" rel="noopener noreferrer">
                            {resource.title}
                          </a>
                          <p>{resource.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
