# News Fetcher

AI News Aggregator that fetches daily news from Reddit, summarizes them using LLM (Ollama or OpenAI), and presents them through a React frontend.

## Features

- 📰 **Multi-source news aggregation**: Fetches AI-related news from Reddit and Hacker News.
- 🤖 **Multi-provider LLM support**: Ollama (self-hosted, free) or OpenAI (cloud, paid)
- ⚙️ **Flexible topic configuration** via a centralized JSON file.
- 🎯 **Provider-specific prompt optimization** for better results
- 💰 **Cost monitoring and logging** for all LLM requests
- 📊 Turso Cloud database (serverless SQLite)
- 🌐 REST API for accessing summaries
- ⚛️ React frontend with markdown rendering
- ⏰ Automated daily fetching at 8 AM
- 📈 LLM usage analytics API

## Prerequisites

- Node.js 24+
- **Turso Cloud account** (free tier available at https://turso.tech)
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

2. **Set up Turso Database**:
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash

   # Login to Turso
   turso auth login

   # Create a new database
   turso db create news-fetcher

   # Get database URL
   turso db show news-fetcher --url

   # Generate auth token
   turso db tokens create news-fetcher
   ```

3. Copy `.env.example` to `.env` and fill in your credentials:

   ```bash
   # Turso Database Configuration
   TURSO_DATABASE_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here

   # Active news providers to fetch from
   ACTIVE_NEWS_PROVIDERS=reddit,hackernews

   # Mock specific providers by listing them (e.g., MOCK_PROVIDERS=reddit,hackernews)
   MOCK_PROVIDERS=reddit

   # Choose your LLM provider
   LLM_PROVIDER=ollama  # or 'openai'

   # For Ollama (free)
   OLLAMA_API_URL=http://localhost:11434
   OLLAMA_MODEL=gpt-oss:20b

   # For OpenAI (paid) - uncomment if using
   # OPENAI_API_KEY=sk-your-key-here
   # OPENAI_MODEL=gpt-4-turbo-preview

   # Slack Integration (optional)
   SLACK_ENABLED=false
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_CHANNEL_ID=general
   SLACK_AUTO_POST=true
   ```

4. Install dependencies:
   ```bash
   npm install
   ```
5. Start development servers:
   ```bash
   npm run dev
   ```

## Topic Configuration

News fetching is driven by a structured configuration file located at `server/src/config/topics.config.json`. This file allows you to define multiple topics, each with its own set of keywords and provider-specific sources.

Here's an example for a single "AI" topic:

```json
[
  {
    "name": "AI",
    "keywords": ["OpenAI", "Claude", "Nvidia", "GPT", "LLM", "AI"],
    "sources": {
      "reddit": ["MachineLearning", "artificial", "LocalLLaMA"],
      "hackernews": ["story"]
    },
    "active": 1
  }
]
```

- `name`: The display name of the topic.
- `keywords`: A list of keywords used to find relevant articles within the sources.
- `sources`: An object where keys are the provider names (e.g., `reddit`, `hackernews`) and values are arrays of source targets (e.g., subreddit names for Reddit).
- `active`: Set to `1` to enable fetching for this topic.

This replaces the previous `.env` variables for keywords and subreddits.

## Google OAuth Authentication

All API endpoints (except `/api/health`) and the frontend are protected by Google OAuth 2.0. Users must sign in with a Google account that matches the configured email allowlist.

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Configure the **OAuth consent screen** if prompted (External is fine for testing)
6. Select **Web application** as the application type
7. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (Vite dev server)
   - `http://localhost:8080` (Docker)
   - Your production domain if applicable
8. Copy the **Client ID**

### Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com  # same value, for Vite

# Session signing secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-random-secret

# Access control (comma-separated, both are optional)
ALLOWED_EMAIL_DOMAINS=moneyfarm.com,anotherdomain.com
ALLOWED_EMAILS=alice@gmail.com,bob@outlook.com
```

- If both `ALLOWED_EMAIL_DOMAINS` and `ALLOWED_EMAILS` are empty, all Google accounts are allowed.
- Otherwise, a user's email must match either an allowed domain or be explicitly listed.

### Auth Endpoints

- `POST /api/auth/google` -- Exchange a Google ID token for a session cookie
- `GET /api/auth/me` -- Check current session (returns user or 401)
- `POST /api/auth/logout` -- Clear the session cookie

## Slack Integration

Post AI news summaries directly to your Slack workspace! Summaries generated by the scheduler can automatically post to Slack, and you can manually share summaries using the "Share to Slack" button in the UI.

### Setup

1. Create a Slack Bot:

   - Go to https://api.slack.com/apps
   - Create a new app or select an existing one
   - Navigate to "OAuth & Permissions"
   - Add the `chat:write` bot token scope
   - Install the app to your workspace
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
   - Invite the bot to your desired channel: `/invite @YourBotName`

2. Configure environment variables:
   ```bash
   SLACK_ENABLED=true
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_CHANNEL_ID=general  # Your channel name (without #)
   SLACK_AUTO_POST=true      # Auto-post scheduled summaries
   ```

### Features

- **Automatic posting**: Scheduled summaries (8 AM daily) automatically post to Slack when `SLACK_AUTO_POST=true`
- **Manual sharing**: Click "Share to Slack" button on any summary in the UI
- **Duplicate prevention**: Each summary can only be posted once to prevent spam
- **Empty summary filtering**: Summaries with no news items are never posted
- **Rich formatting**: Uses Slack Block Kit for beautiful, readable messages with:
  - Header with topic and date
  - Overview, Key Developments, and Notable Highlights sections
  - Top 5 sources with links and scores

### Testing

Test your Slack connection:

```bash
curl -X POST http://localhost:3000/api/slack/test
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

### Slack Integration

- `POST /api/slack/send/:id` - Manually post a summary to Slack
- `POST /api/slack/test` - Test Slack webhook connection

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
