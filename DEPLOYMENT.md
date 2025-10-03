# Deploying to Vercel

This project is configured to be deployed to Vercel as a monorepo. The React client is deployed as a static site, and the Express server is deployed as a serverless function.

## Prerequisites

*   A Vercel account.
*   The Vercel CLI installed (`npm i -g vercel`).

## Deployment Steps

1.  **Log in to Vercel:**
    ```bash
    vercel login
    ```

2.  **Link the project:**
    From the root of the `LearnX` directory, run:
    ```bash
    vercel link
    ```
    Follow the prompts to link the project to a new or existing Vercel project.

3.  **Deploy:**
    ```bash
    vercel --prod
    ```

That's it! Vercel will automatically detect the `vercel.json` file and deploy the project according to the configuration.

## Environment Variables

You will need to add your `MONGO_URI` to the Vercel project's environment variables. You can do this in the project settings on the Vercel dashboard.
