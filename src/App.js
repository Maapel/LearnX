import React, { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [topic, setTopic] = useState('');
  const [course, setCourse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_BASE_URL = '/api';

      // Call the scraping endpoint
      const response = await axios.post(`${API_BASE_URL}/scrape`, {
        topic: topic
      });

      console.log('Scraping response:', response.data);

      // Transform the scraped links into a course format for display
      const scrapedData = response.data;
      setCourse({
        topic: scrapedData.topic,
        outline: {
          modules: [{
            title: 'Learning Resources',
            resources: scrapedData.links.map(link => ({
              title: link.title,
              link: link.link,
              snippet: link.snippet
            }))
          }]
        }
      });
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
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
