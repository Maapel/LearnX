LearnX: AI Agent Development and Feature Implementation Plan
1. Project Vision
To create an AI-powered, self-learning tool that automatically generates structured, personalized educational modules from various content sources. The primary goal is to minimize the user's effort in curating learning materials and to provide an interactive, adaptive learning experience.

2. High-Level AI Workflow
The core of LearnX is a multi-stage AI pipeline that transforms unstructured information into a coherent educational course.

Phase 1: Intelligent Content Aggregation & Analysis
Objective: To gather high-quality, diverse content and extract the foundational concepts of a given topic.

Diversified Search Strategy:

Instead of a single search query, generate 3-5 query variations to cover different aspects of the topic.

Example for "React Hooks":

"React Hooks tutorial for beginners"

"Advanced React Hooks patterns"

"React Hooks official documentation"

"Common React Hooks mistakes"

"React Hooks real-world examples"

Content Scraping and Cleaning:

Execute the search queries using the Google Custom Search API (/api/scrape).

From the search results, select the top 3-5 most relevant and authoritative URLs (prioritizing official documentation, reputable educational platforms, and well-regarded blogs).

For each selected URL, scrape the full text content.

Clean the scraped HTML to extract pure, unstructured text. Remove navigation bars, footers, advertisements, scripts, and styles.

Core Concept Extraction:

Combine the cleaned text from all sources.

Send the combined text to a Large Language Model (LLM) with the following prompt:

Prompt: "Analyze the following content about [topic]. Identify and extract the top 10-15 core concepts, technologies, and key terms. For each item, provide a concise, one-sentence summary. Return the result as a JSON array of objects, each with 'concept' and 'summary' keys."

Phase 2: Structured Course Outline Generation
Objective: To create a logical, well-structured syllabus based on the extracted concepts.

Syllabus and Module Creation:

Use the key concepts from Phase 1 to generate a course outline.

Prompt:

Prompt: "You are an expert curriculum designer. Create a course syllabus for a [Beginner/Intermediate/Advanced] level course on [topic]. The course should be practical and hands-on. Use the following key concepts to guide the structure: [list of concepts from Phase 1].

Your output must be a JSON object with the following structure:
{
"courseTitle": "A Comprehensive Guide to [topic]",
"courseDescription": "A 2-3 sentence overview of the course.",
"learningObjectives": ["Objective 1", "Objective 2", ...],
"modules": [
{
"module": 1,
"title": "Module 1 Title",
"description": "A 2-3 sentence module description.",
"learningObjectives": ["Objective A", "Objective B", ...]
},
... (generate 4-6 modules)
]
}"

Resource-to-Module Mapping:

For each module in the generated syllabus, identify the most relevant scraped content.

Prompt:

Prompt: "Given the following course modules and scraped content summaries, map the most relevant content source to each module.

Modules:
[Insert module titles and descriptions from the syllabus]

Content Sources:

URL: https://www.youtube.com/watch?v=KsZ6tROaVOQ, Summary: [Summary of scraped content 1]

URL: https://www.youtube.com/watch?v=-s7TCuCpB5c, Summary: [Summary of scraped content 2]
...

Return a JSON object mapping each module number to the most relevant URL."

Phase 3: Content Generation and Enrichment
Objective: To generate detailed, multi-faceted content for each module.

Iterative Module Content Generation:

For each module, take the full text from its mapped resource URL.

Send this focused content to the LLM with a detailed prompt.

Prompt:

Prompt: "You are a teacher creating a learning module on '[Module Title]' for a course on [topic]. Using the provided text as your primary reference, generate the content for this module in a clear, easy-to-understand manner.

Reference Text:
[Insert full text from the mapped resource]

Your output must be a single JSON object containing:

theory: A detailed explanation of the module's topics (at least 500 words).

examples: 2-3 practical, real-world examples with code snippets (if applicable).

exercises: An array of 3-5 hands-on exercises, each with a 'title', 'description', and 'difficulty' (Easy, Medium, Hard).

quiz: An array of 3-5 multiple-choice questions, each with 'question', 'options' (an array of 4 strings), and 'answer' (the correct option)."

Multimedia Integration:

During the initial scraping phase, identify links to YouTube or other video platforms.

Embed these videos directly within the relevant generated modules to provide a richer learning experience.

Phase 4: Final Review and Assembly
Objective: To ensure the final course is polished and coherent.

Cohesion and Consistency Check:

After generating all modules, perform a final pass. Provide the titles and descriptions of all modules to the LLM.

Prompt: "Review the following module titles and descriptions for a course on [topic]. Identify any significant overlaps or inconsistencies in terminology. Suggest improvements for a better logical flow."

"Further Reading" Section:

For each module, compile a list of the scraped URLs that were not used as the primary source for content generation.

Add these under a "Further Reading" or "Additional Resources" section at the end of each module.

3. WebApp Workflow and Feature Enhancements
User Interface and Experience (UX) Flow
Input Screen:

User enters a topic.

New Feature: Add a dropdown for difficulty (Beginner, Intermediate, Advanced) to pass to the AI prompts.

Loading/Generation Screen:

Enhancement: Instead of a generic spinner, display real-time progress updates to the user. The frontend should reflect the current stage of the AI workflow.

States to Display:

Phase 1: Gathering and analyzing content from the web...

Phase 2: Designing your personalized course syllabus...

Phase 3: Generating content for Module X of Y...

Phase 4: Finalizing your course...

Course View Screen:

Enhancement:

Implement a collapsible sidebar for easy navigation between modules.

Add a progress bar at the top to show course completion status.

Make quizzes interactive: allow users to select an answer and receive immediate "Correct" or "Incorrect" feedback with the explanation.

New Interactive Features
"Ask a Doubt" Functionality:

At the end of each major theory section, add an "Ask a Doubt" button.

This button will open a modal with a chat interface.

The user's question, along with the text of the current section, will be sent to the LLM.

Prompt: "You are a helpful teaching assistant. Based on the following context, answer the user's question. Context: [Insert text of the current section] Question: [Insert user's question]"

In-Browser Code Editor:

For modules that include code examples, integrate a lightweight code editor (e.g., CodeMirror, Monaco Editor).

Allow users to edit and run simple JavaScript snippets directly on the page to better understand the examples.

4. Future Feature Roadmap: Textbook & Notes Integration (RAG)
Objective: Allow users to upload their own documents (textbooks, notes) to create a course or get answers grounded in their specific materials.

File Upload and Parsing (Backend):

Frontend: Create a new component in the React app for file uploads (.pdf, .txt, .md, .docx).

Backend: Create a new API endpoint (/api/upload) to handle file intake. Use libraries like pdf-parse for PDFs and mammoth for DOCX to extract raw text.

Content Chunking and Vectorization:

Break the extracted text into small, semantically meaningful chunks (e.g., 2-3 sentences per chunk).

Use an embedding model (e.g., via OpenAI or Google's Gemini API) to convert each text chunk into a numerical vector.

Store these vectors and their corresponding text chunks in a vector database (e.g., Pinecone, Weaviate, ChromaDB).

Retrieval-Augmented Generation (RAG) Implementation:

When a user asks a question via the "Ask a Doubt" feature on a custom-document course:

Convert the user's question into a vector using the same embedding model.

Query the vector database to find the top 3-5 most similar (i.e., most relevant) text chunks.

Pass these chunks as context to the LLM.

RAG Prompt:

Prompt: "You are a helpful teaching assistant. Answer the user's question based only on the provided context from their document.

Context from Document:

[Relevant text chunk 1]

[Relevant text chunk 2]

[Relevant text chunk 3]

User's Question:
[Insert user's question here]"

This ensures that the AI's responses are highly relevant and based entirely on the user's provided learning materials.