# Quick Start Guide - Multi-Provider LLM

## 🚀 Get Started in 5 Minutes

### Option 1: Using Ollama (Free, Local)

1. **Install Ollama** (if not already installed)

   ```bash
   # Visit: https://ollama.ai/download
   # Or on Linux/Mac:
   curl https://ollama.ai/install.sh | sh
   ```

2. **Download a model**

   ```bash
   ollama pull gpt-oss:20b
   # Or try smaller models:
   # ollama pull llama2:7b
   # ollama pull mistral:7b
   ```

3. **Configure the app** (`.env`)

   ```bash
   LLM_PROVIDER=ollama
   OLLAMA_API_URL=http://localhost:11434
   OLLAMA_MODEL=gpt-oss:20b
   ```

4. **Start the app**

   ```bash
   npm install
   npm run dev
   ```

5. **Test it**
   ```bash
   curl -X POST http://localhost:3000/api/fetch \
     -H "Content-Type: application/json" \
     -d '{"topic":"AI"}'
   ```

### Option 2: Using OpenAI (Paid, Cloud)

1. **Get API Key**

   - Visit: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy it (starts with `sk-`)

2. **Configure the app** (`.env`)

   ```bash
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-your-actual-key-here
   OPENAI_MODEL=gpt-4-turbo-preview
   ```

3. **Start the app**

   ```bash
   npm install
   npm run dev
   ```

4. **Test it**

   ```bash
   curl -X POST http://localhost:3000/api/fetch \
     -H "Content-Type: application/json" \
     -d '{"topic":"AI"}'
   ```

5. **Check costs**
   ```bash
   curl http://localhost:3000/api/llm/stats
   ```

## 🔄 Switching Between Providers

Just change one line in `.env` and restart:

```bash
# Switch to Ollama
LLM_PROVIDER=ollama

# Switch to OpenAI
LLM_PROVIDER=openai
```

## 📊 Monitor Usage

### View Statistics

```bash
curl http://localhost:3000/api/llm/stats | jq
```

### View Recent Logs

```bash
curl http://localhost:3000/api/llm/logs?limit=10 | jq
```

### Check Current Provider

```bash
curl http://localhost:3000/api/llm/provider | jq
```

## 🐛 Troubleshooting

### Ollama Not Working?

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it:
ollama serve

# Check available models:
ollama list
```

### OpenAI Not Working?

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check billing: https://platform.openai.com/account/billing
```

### Still Having Issues?

1. Check `.env` file is in the correct location
2. Restart the server after changing `.env`
3. Check server logs for error messages
4. Verify `npm install` completed successfully
5. See [LLM_PROVIDER_GUIDE.md](./LLM_PROVIDER_GUIDE.md) for detailed troubleshooting

## 💡 Tips

- **Development**: Use Ollama (free, unlimited)
- **Production**: Use OpenAI (highest quality)
- **Testing**: Always test with Ollama first
- **Cost Control**: Monitor `/api/llm/stats` regularly
- **Performance**: Ollama is faster on good hardware
- **Quality**: OpenAI generally produces better summaries

## 📁 Important Files

- `.env` - Configuration (LLM provider, API keys)
- `llm-requests.log` - All LLM requests logged here
- `server/src/services/llm/` - LLM service implementations
- `LLM_PROVIDER_GUIDE.md` - Detailed documentation

## 🎯 Common Use Cases

### Use Case 1: Development with Free LLM

```bash
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama2:7b  # Faster, smaller model
```

### Use Case 2: Production with Best Quality

```bash
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4-turbo-preview
```

### Use Case 3: Production with Cost Optimization

```bash
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-3.5-turbo  # 20x cheaper than GPT-4
```

### Use Case 4: Hybrid (Dev: Ollama, Prod: OpenAI)

```bash
# .env.development
LLM_PROVIDER=ollama

# .env.production
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-prod-key-here
```

## 📈 Expected Costs (OpenAI)

Typical news summary generation:

- Input: ~2,000 tokens (news items)
- Output: ~800 tokens (summary)
- Total: ~2,800 tokens

**Cost per summary:**

- GPT-3.5-turbo: ~$0.003 (⅓ of a cent)
- GPT-4-turbo: ~$0.08 (8 cents)
- GPT-4: ~$0.14 (14 cents)

**Monthly cost (1 summary/day):**

- GPT-3.5-turbo: ~$0.09
- GPT-4-turbo: ~$2.40
- GPT-4: ~$4.20

## ✅ Verification Checklist

After setup, verify:

- [ ] Server starts without errors
- [ ] Correct provider shown in startup logs
- [ ] Can fetch summaries (`POST /api/fetch`)
- [ ] Logs are being written (`llm-requests.log`)
- [ ] Stats endpoint works (`GET /api/llm/stats`)
- [ ] Frontend can display summaries

## 🆘 Getting Help

1. Check the logs: `llm-requests.log`
2. Read: `LLM_PROVIDER_GUIDE.md`
3. Review: `ARCHITECTURE.md`
4. Check: `IMPLEMENTATION_SUMMARY.md`

## 🎉 You're All Set!

Your news-fetcher now supports multiple LLM providers with cost monitoring. Choose the provider that best fits your needs and budget!
