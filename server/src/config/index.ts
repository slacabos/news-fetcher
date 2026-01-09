import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    userAgent: process.env.REDDIT_USER_AGENT || 'news-fetcher-bot/1.0.0',
  },
  
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gpt-oss:20b',
  },
  
  database: {
    path: process.env.DATABASE_PATH || './news.sqlite',
  },
  
  topics: {
    ai: {
      name: 'AI',
      keywords: ['OpenAI', 'Claude', 'Nvidia', 'GPT', 'LLM', 'AI', 'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Anthropic'],
      subreddits: ['MachineLearning', 'artificial', 'LocalLLaMA', 'OpenAI', 'singularity'],
    },
  },
  
  scheduler: {
    cronTime: '0 8 * * *', // 8 AM daily
  },
};
