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


      axios.get(`${API_BASE_URL}`).then((data) => {
    //this console.log will be in our frontend console
     console.log("hi");

      console.log(data);
      setCourse({ topic: data.message, outline: { modules: [] } });
    console.log(data)
  })
     
     
    } catch (err) {
      console.error(err);
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
