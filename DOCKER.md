# Docker Setup Guide

This guide explains how to run the News Fetcher application using Docker.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Reddit API credentials (get them at https://www.reddit.com/prefs/apps)
- **Either** Ollama running on your host machine **OR** OpenAI API key

### 1. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# Optional: Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=news-fetcher-bot/1.0.0

# Choose your LLM provider
LLM_PROVIDER=ollama  # or 'openai'

# If using Ollama (default, free)
OLLAMA_API_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gpt-oss:20b

# If using OpenAI (alternative, paid)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4-turbo-preview
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## LLM Provider Setup

### Option 1: Ollama (Default, Free)

If Ollama is running on your host machine:

1. Make sure Ollama is installed and running: `ollama serve`
2. Pull the model: `ollama pull gpt-oss:20b`
3. The Docker container will connect to `host.docker.internal:11434`

**Linux users**: Replace `host.docker.internal` with your host IP (e.g., `192.168.1.100`)

### Option 2: OpenAI (Paid)

1. Set `LLM_PROVIDER=openai` in `.env`
2. Add your `OPENAI_API_KEY` to `.env`
3. Choose a model (e.g., `gpt-4-turbo-preview`)

## Docker Architecture

The application consists of two services:

### Server Container

- **Image**: Node.js 18 Alpine
- **Port**: 3000
- **Function**: Express API server, handles news fetching, LLM summarization, and scheduling
- **Volumes**:
  - `news-data`: SQLite database persistence
  - `llm-logs`: LLM request logs

### Client Container

- **Image**: Nginx Alpine
- **Port**: 8080 (mapped from 80)
- **Function**: Serves React frontend, proxies API requests to server
- **Static files**: Pre-built React app served by Nginx

## Volumes

The application uses Docker volumes for data persistence:

- **news-data**: Stores the SQLite database
- **llm-logs**: Stores LLM request logs for cost monitoring

To inspect volumes:

```bash
docker volume ls
docker volume inspect news-fetcher_news-data
```

To backup data:

```bash
# Backup database
docker cp news-fetcher-server:/app/data/news.sqlite ./backup-news.sqlite

# Backup logs
docker cp news-fetcher-server:/app/logs/llm-requests.log ./backup-llm-logs.log
```

## Common Commands

```bash
# Build without cache
docker-compose build --no-cache

# Start in foreground (see logs)
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f client

# Restart a service
docker-compose restart server

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (deletes data!)
docker-compose down -v

# Execute command in running container
docker-compose exec server sh
docker-compose exec client sh

# Check service status
docker-compose ps
```

## Troubleshooting

### Server can't connect to Ollama

**Linux users**: `host.docker.internal` doesn't work on Linux by default.

Solution: Use your host machine's IP address:

```bash
# Find your IP
ip addr show

# Update .env
OLLAMA_API_URL=http://192.168.1.100:11434
```

Or use Docker host network mode (Linux only):

```yaml
services:
  server:
    network_mode: "host"
```

### Port already in use

If ports 3000 or 8080 are already in use, edit `docker-compose.yml`:

```yaml
services:
  server:
    ports:
      - "3001:3000" # Changed from 3000:3000

  client:
    ports:
      - "8081:80" # Changed from 8080:80
```

### Database is empty after restart

Make sure you're not using the `-v` flag with `docker-compose down`, which deletes volumes.

### Client can't connect to server

Check that the nginx configuration proxies to the correct server name (`server:3000` in docker-compose network).

## Production Deployment

For production deployments, consider:

1. **Use environment-specific compose files**:

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

2. **Enable HTTPS**: Mount SSL certificates and update nginx config

3. **Set resource limits** in docker-compose.yml:

   ```yaml
   services:
     server:
       deploy:
         resources:
           limits:
             cpus: "1"
             memory: 1G
   ```

4. **Use secrets** for sensitive data instead of environment variables

5. **Set up monitoring** with health checks:
   ```yaml
   services:
     server:
       healthcheck:
         test:
           [
             "CMD",
             "wget",
             "--quiet",
             "--tries=1",
             "--spider",
             "http://localhost:3000/api/health",
           ]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

## Development vs Production

For local development, you may want to:

- Use `docker-compose.dev.yml` with hot-reload volumes
- Mount source code as volumes for live updates
- Expose additional debugging ports

For production:

- Use multi-stage builds (already configured)
- Don't mount source code
- Use production-optimized images
- Enable security scanning

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build

# Restart with new images
docker-compose up -d
```

## Cleaning Up

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove images
docker rmi news-fetcher-server news-fetcher-client

# Clean up all unused Docker resources
docker system prune -a
```
