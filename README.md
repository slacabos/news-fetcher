# News Fetcher

AI News Aggregator that fetches daily news from Reddit, summarizes them using LLM (Ollama or OpenAI), and presents them through a React frontend.

## Features

- 📰 Fetches AI-related news from Reddit (r/MachineLearning, r/artificial, r/LocalLLaMA, r/OpenAI, r/singularity)
- 🤖 **Multi-provider LLM support**: Ollama (self-hosted, free) or OpenAI (cloud, paid)
- 🎯 **Provider-specific prompt optimization** for better results
- 💰 **Cost monitoring and logging** for all LLM requests
- 📊 SQLite database for storage
- 🌐 REST API for accessing summaries
- ⚛️ React frontend with markdown rendering
- ⏰ Automated daily fetching at 8 AM
- 📈 LLM usage analytics API

## Prerequisites

- Node.js 18+
- **Either**: Ollama installed and running locally (free, recommended for development)
- **Or**: OpenAI API key (paid, recommended for production)
- Reddit API credentials (create an app at https://www.reddit.com/prefs/apps)

## LLM Providers

### Ollama (Default)

- **Cost**: Free (self-hosted)
- **Privacy**: Complete data privacy
- **Setup**: Install Ollama, download model (`ollama pull gpt-oss:20b`)
- **Best for**: Development, unlimited testing

### OpenAI

- **Cost**: Pay-per-use (starting at $0.50 per 1M tokens)
- **Quality**: State-of-the-art models (GPT-4)
- **Setup**: API key from platform.openai.com
- **Best for**: Production, highest quality summaries

See [LLM_PROVIDER_GUIDE.md](./LLM_PROVIDER_GUIDE.md) for detailed configuration and cost monitoring.

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials:

   ```bash
   # Choose your LLM provider
   LLM_PROVIDER=ollama  # or 'openai'

   # For Ollama (free)
   OLLAMA_API_URL=http://localhost:11434
   OLLAMA_MODEL=gpt-oss:20b

   # For OpenAI (paid) - uncomment if using
   # OPENAI_API_KEY=sk-your-key-here
   # OPENAI_MODEL=gpt-4-turbo-preview
   ```

3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development servers:
   ```bash
   npm run dev
   ```

## API Endpoints

### Summaries

- `GET /api/summaries/latest` - Get the most recent summary
- `GET /api/summaries` - Get summaries (supports ?date=YYYY-MM-DD and ?topic=name)
- `GET /api/summaries/:id` - Get specific summary by ID
- `POST /api/fetch` - Manually trigger news fetching

### Topics

- `GET /api/topics` - List all topics

### LLM Analytics (New!)

- `GET /api/llm/stats` - Get usage statistics and costs
- `GET /api/llm/logs?limit=100` - Get recent LLM request logs
- `GET /api/llm/provider` - Get current provider information

## Cost Monitoring

Every LLM request is logged to `llm-requests.log` with:

- Token usage (input/output/total)
- Estimated cost (for OpenAI)
- Response time
- Success/failure status

View analytics at: `http://localhost:3000/api/llm/stats`

## Development

- Backend runs on http://localhost:3000
- Frontend runs on http://localhost:5173
- Current LLM provider shown on startup
