# News Fetcher

AI News Aggregator that fetches daily news from Reddit, summarizes them using local Ollama LLM, and presents them through a React frontend.

## Features

- 📰 Fetches AI-related news from Reddit (r/MachineLearning, r/artificial, r/LocalLLaMA, r/OpenAI, r/singularity)
- 🤖 Uses local Ollama (gpt-oss:20b) for summarization
- 📊 SQLite database for storage
- 🌐 REST API for accessing summaries
- ⚛️ React frontend with markdown rendering
- ⏰ Automated daily fetching at 8 AM

## Prerequisites

- Node.js 18+
- Ollama installed and running locally
- Reddit API credentials (create an app at https://www.reddit.com/prefs/apps)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development servers:
   ```bash
   npm run dev
   ```

## API Endpoints

- `GET /api/summaries/latest` - Get the most recent summary
- `GET /api/summaries` - Get summaries (supports ?date=YYYY-MM-DD and ?topic=name)
- `GET /api/topics` - List all topics
- `POST /api/fetch` - Manually trigger news fetching

## Development

- Backend runs on http://localhost:3000
- Frontend runs on http://localhost:5173
