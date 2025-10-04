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

      // Simple API call to get learning resources
      const response = await axios.post(`${API_BASE_URL}/scrape`, {
        topic: topic
      });

      console.log('Response:', response.data);

      // Use the response data directly
      const data = response.data;

      setCourse({
        topic: data.topic,
        outline: {
          modules: data.modules.map(module => ({
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
    } catch (err) {
      console.error('Error:', err);
      setCourse({
        topic: topic,
        outline: {
          modules: [{
            title: 'Getting Started',
            resources: [{
              title: `Learning ${topic}`,
              link: '#',
              snippet: 'Basic learning resources for this topic.',
              type: 'article'
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

            {course.outline.modules.map((module, index) => (
              <div key={index}>
                <h3>{module.title}</h3>
                <ul>
                  {module.resources.map((resource, i) => (
                    <li key={i} className={`resource-item ${resource.type}`}>
                      <div className="resource-header">
                        <a href={resource.link} target="_blank" rel="noopener noreferrer">
                          {resource.title}
                        </a>
                        <span className={`resource-type ${resource.type}`}>
                          {resource.type}
                        </span>
                        {resource.scraped && (
                          <span className="scraped-badge">✓ Content Available</span>
                        )}
                      </div>
                      <p className="resource-snippet">{resource.snippet}</p>
                      {resource.content && resource.content !== resource.snippet && (
                        <details className="resource-content">
                          <summary>View Content</summary>
                          <p className="extracted-content">{resource.content}</p>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
