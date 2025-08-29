# LearnX Project: Progress and Pending Tasks

This document tracks the development progress of the LearnX project.

## Completed Tasks

- **Project Setup (MVP)**
  - [x] Created main project folder `LearnX`.
  - [x] Set up `client` (React) and `server` (Node.js/Express) subdirectories.
  - [x] Initialized Node.js project in `server` and installed dependencies (`express`, `cheerio`, `axios`, `mongoose`, `dotenv`).
  - [x] Created initial `index.js` and `.env` files for the server.
  - [x] Created the React application in the `client` directory.
  - [x] Configured proxy in `client/package.json` to communicate with the backend.
  - [x] Initialized a Git repository for the project.
  - [x] Created a public repository on GitHub: [https://github.com/Maapel/LearnX](https://github.com/Maapel/LearnX)
  - [x] Pushed the initial project setup to the GitHub repository.

## Pending Tasks

### Backend
- **Web Scraping Engine**
  - [ ] Create an API endpoint to receive a topic from the frontend.
  - [ ] Implement web scraping logic using `axios` and `cheerio` to fetch relevant articles and video links.
  - [ ] Define a schema and model for storing scraped data in MongoDB.
- **AI Processing Core**
  - [ ] Integrate with an LLM API (e.g., Gemini or GPT).
  - [ ] Create a service to process scraped content and generate a course outline.
  - [ ] Store the generated course structure in MongoDB.
- **API Development**
  - [ ] Create API endpoints for the frontend to fetch generated courses.

### Frontend
- **User Interface**
  - [ ] Design and implement a user interface for inputting a topic.
  - [ ] Create components to display the generated course outline in a clean, navigable format.
  - [ ] Implement functionality to make API calls to the backend.
