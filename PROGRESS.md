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

## Completed Tasks (Continued)

### Backend
- **Web Scraping Engine**
  - [x] Created an API endpoint to receive a topic from the frontend.
  - [x] Implemented web scraping logic using `axios` and `cheerio` to fetch relevant articles and video links.
  - [x] Defined a schema and model for storing scraped data in MongoDB.
- **AI Processing Core**
  - [x] Integrated with an LLM API (SerpApi).
  - [x] Created a service to process scraped content and generate a course outline.
  - [x] Stored the generated course structure in MongoDB.
  - [x] Replaced SerpApi with OpenAI for AI processing.
  - [x] Integrated Vercel AI SDK for streaming responses from OpenAI API.
- **API Development**
  - [x] Created API endpoints for the frontend to fetch generated courses.

### Frontend
- **User Interface**
  - [x] Designed and implemented a user interface for inputting a topic.
  - [x] Created components to display the generated course outline in a clean, navigable format.
  - [x] Implemented functionality to make API calls to the backend.

## Pending Tasks

### For Testing Web Scraping (Temporary Changes - Reverted)
- [x] Updated `LearnX/server/.env` to use local MongoDB and commented out `OPENAI_API_KEY`.
- [x] Removed AI route from `LearnX/server/index.js`.
- [x] Modified `LearnX/client/src/App.js` to only call the scrape API and display raw links.
- [x] Updated `PROGRESS.md` to reflect these temporary changes.

### Multi-LLM Support (Gemini Integration)
- [x] Installed `@google/generative-ai` package.
- [x] Updated `.env` to include `GEMINI_API_KEY` and `ACTIVE_LLM` variable.
- [x] Modified `ai.js` to dynamically choose between OpenAI and Gemini.
- [ ] Update `PROGRESS.md` to reflect these changes.
