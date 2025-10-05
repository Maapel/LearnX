import React, { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [evaluateAuthenticity, setEvaluateAuthenticity] = useState(false);
  const [generateCourse, setGenerateCourse] = useState(false);
  const [provider, setProvider] = useState('gemini');
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
        requestData.provider = provider;
        requestData.generateCourse = generateCourse;
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
          mostAuthenticSource: data.mostAuthenticSource,
          courseStructure: data.courseStructure
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
              Evaluate source authenticity (requires AI API key)
            </label>

            {evaluateAuthenticity && (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={generateCourse}
                    onChange={(e) => setGenerateCourse(e.target.checked)}
                  />
                  Generate complete course structure (scrapes content and creates structured course)
                </label>

                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="provider-select"
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="groq">Groq (Fast AI)</option>
                </select>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : 'Groq'} API key`}
                />
              </>
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

                {course.courseStructure && (
                  <div className="course-structure">
                    <h3>📚 Complete Course Structure</h3>
                    {course.courseStructure.generationPhases && (
                      <div className="generation-phases">
                        <h4>🔄 Generation Process:</h4>
                        <ul>
                          {Object.entries(course.courseStructure.generationPhases).map(([phase, description]) => (
                            <li key={phase}>✅ {description}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="course-structure-content">
                      <div className="course-header">
                        <h4>{course.courseStructure.courseTitle}</h4>
                        <p className="course-description">{course.courseStructure.description}</p>
                      </div>

                      <div className="course-objectives">
                        <h5>🎯 Learning Objectives</h5>
                        <ul>
                          {course.courseStructure.learningObjectives.map((objective, index) => (
                            <li key={index}>{objective}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="course-prerequisites">
                        <h5>📋 Prerequisites</h5>
                        <ul>
                          {course.courseStructure.prerequisites.map((prereq, index) => (
                            <li key={index}>{prereq}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="course-modules">
                        <h5>📖 Course Modules</h5>
                        {course.courseStructure.modules.map((module, index) => (
                          <div key={index} className="module-card">
                            <div className="module-header-section">
                              <h6 className="module-title">{module.title}</h6>
                              <div className="module-meta">
                                <span className="module-time">⏱️ {module.content?.estimatedTime || module.estimatedTime}</span>
                              </div>
                            </div>

                            {/* Module Overview */}
                            {module.content?.overview && (
                              <div className="module-overview">
                                <h7>Module Overview</h7>
                                <p className="overview-text">{module.content.overview}</p>
                              </div>
                            )}

                            {/* Prerequisites */}
                            {module.content?.prerequisites && module.content.prerequisites.length > 0 && (
                              <div className="module-prerequisites">
                                <h7>Prerequisites</h7>
                                <ul>
                                  {module.content.prerequisites.map((prereq, i) => (
                                    <li key={i}>{prereq}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Learning Objectives */}
                            {module.content?.objectives && module.content.objectives.length > 0 && (
                              <div className="module-objectives">
                                <h7>Learning Objectives</h7>
                                <ul>
                                  {module.content.objectives.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Learning Sections - Main Content */}
                            {module.content?.learningSections && module.content.learningSections.length > 0 && (
                              <div className="learning-sections">
                                <h7>📖 Learning Content</h7>
                                {module.content.learningSections.map((section, i) => (
                                  <div key={i} className="learning-section">
                                    <h8>{section.title}</h8>
                                    <div className="section-content">
                                      {section.content.split('\n').map((paragraph, j) => (
                                        <p key={j}>{paragraph}</p>
                                      ))}
                                    </div>

                                    {section.keyConcepts && section.keyConcepts.length > 0 && (
                                      <div className="section-concepts">
                                        <strong>🔑 Key Concepts:</strong>
                                        <ul>
                                          {section.keyConcepts.map((concept, k) => (
                                            <li key={k}>{concept}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {section.codeExamples && section.codeExamples.length > 0 && (
                                      <div className="code-examples">
                                        <strong>💻 Code Examples:</strong>
                                        {section.codeExamples.map((code, k) => (
                                          <pre key={k} className="code-block">
                                            <code>{code}</code>
                                          </pre>
                                        ))}
                                      </div>
                                    )}

                                    {section.tips && section.tips.length > 0 && (
                                      <div className="section-tips">
                                        <strong>💡 Tips:</strong>
                                        <ul>
                                          {section.tips.map((tip, k) => (
                                            <li key={k}>{tip}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {section.commonMistakes && section.commonMistakes.length > 0 && (
                                      <div className="section-mistakes">
                                        <strong>⚠️ Common Mistakes to Avoid:</strong>
                                        <ul>
                                          {section.commonMistakes.map((mistake, k) => (
                                            <li key={k}>{mistake}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Practice Exercises */}
                            {module.content?.exercises && module.content.exercises.length > 0 && (
                              <div className="module-exercises">
                                <h7>🛠️ Practice Exercises</h7>
                                <div className="exercises-list">
                                  {module.content.exercises.map((exercise, i) => (
                                    <div key={i} className="exercise-item">
                                      <div className="exercise-header">
                                        <strong>{exercise.title}</strong>
                                        <span className={`difficulty ${(exercise.difficulty || 'intermediate').toLowerCase()}`}>
                                          {exercise.difficulty || 'Intermediate'}
                                        </span>
                                        <span className="exercise-time">{exercise.timeEstimate || exercise.estimatedTime || '30 minutes'}</span>
                                      </div>

                                      <div className="exercise-description">
                                        <p>{exercise.description || 'Complete this practical exercise to apply your learning.'}</p>

                                        {exercise.steps && exercise.steps.length > 0 && (
                                          <div className="exercise-steps">
                                            <strong>Steps:</strong>
                                            <ol>
                                              {exercise.steps.map((step, j) => (
                                                <li key={j}>{step}</li>
                                              ))}
                                            </ol>
                                          </div>
                                        )}

                                        {exercise.expectedOutcome && (
                                          <div className="expected-outcome">
                                            <strong>Expected Outcome:</strong>
                                            <p>{exercise.expectedOutcome}</p>
                                          </div>
                                        )}

                                        {exercise.learningObjectives && exercise.learningObjectives.length > 0 && (
                                          <div className="exercise-learning-objectives">
                                            <strong>Learning Objectives:</strong>
                                            <ul>
                                              {exercise.learningObjectives.map((obj, j) => (
                                                <li key={j}>{obj}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Module Quiz */}
                            {module.content?.quiz && module.content.quiz.length > 0 && (
                              <div className="module-quiz">
                                <h7>📝 Knowledge Check</h7>
                                <div className="quiz-questions">
                                  {module.content.quiz.map((question, i) => (
                                    <div key={i} className="quiz-question">
                                      <h9>Question {i + 1}: {question.question}</h9>

                                      {question.options && question.options.length > 0 ? (
                                        <div className="quiz-options">
                                          {question.options.map((option, j) => (
                                            <div key={j} className={`quiz-option ${option.startsWith(question.correctAnswer) ? 'correct' : ''}`}>
                                              {option}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="quiz-open-answer">
                                          <em>Open-ended question</em>
                                        </div>
                                      )}

                                      {question.explanation && (
                                        <div className="quiz-explanation">
                                          <strong>Explanation:</strong>
                                          <p>{question.explanation}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Module Summary */}
                            {module.content?.summary && (
                              <div className="module-summary">
                                <h7>📋 Module Summary</h7>
                                <p className="summary-text">{module.content.summary}</p>

                                {module.content.keyTakeaways && module.content.keyTakeaways.length > 0 && (
                                  <div className="key-takeaways">
                                    <strong>🎯 Key Takeaways:</strong>
                                    <ul>
                                      {module.content.keyTakeaways.map((takeaway, i) => (
                                        <li key={i}>{takeaway}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Module References */}
                            {module.references && module.references.length > 0 && (
                              <div className="module-references">
                                <h7>🔗 Additional References</h7>
                                <div className="references-list">
                                  {module.references.map((ref, i) => (
                                    <div key={i} className="reference-item">
                                      <div className="reference-header">
                                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="reference-link">
                                          {ref.title}
                                        </a>
                                        <span className={`reference-type ${ref.type}`}>{ref.type}</span>
                                      </div>
                                      <p className="reference-description">{ref.description}</p>
                                      <p className="reference-relevance"><em>{ref.relevance}</em></p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="course-assessment">
                        <h5>📝 Assessment Methods</h5>
                        <ul>
                          {course.courseStructure.assessmentMethods.map((method, index) => (
                            <li key={index}>{method}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="course-resources">
                        <h5>🔗 Additional Resources</h5>
                        <ul>
                          {course.courseStructure.additionalResources.map((resource, index) => (
                            <li key={index}>{resource}</li>
                          ))}
                        </ul>
                      </div>
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
