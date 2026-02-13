# AI Providers Guide

The OPTCG AI Agent supports multiple AI providers for deck analysis. You can choose the provider that best fits your needs based on cost, performance, and availability.

## Supported Providers

### 1. **Anthropic (Claude)** ✨ Recommended
- **Models**: Claude Sonnet 4.5, Claude Opus 4.6, Claude Haiku 4.5
- **Best for**: High-quality analysis with deep strategic insights
- **Pricing**: $3/M input tokens, $15/M output tokens (Sonnet 4.5)
- **Context**: 200k tokens
- **Speed**: Medium-Fast
- **Sign up**: https://console.anthropic.com/

**Configuration:**
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 2. **OpenAI (GPT-4)**
- **Models**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Best for**: General-purpose analysis, fast responses
- **Pricing**: $10/M input tokens, $30/M output tokens (GPT-4 Turbo)
- **Context**: 128k tokens
- **Speed**: Fast
- **Sign up**: https://platform.openai.com/signup

**Configuration:**
```bash
OPENAI_API_KEY=sk-your-key-here
```

### 3. **OpenRouter** 🌟 Best Value
- **Models**: Claude, GPT-4, Gemini, Llama 3, and 100+ more
- **Best for**: Access to multiple models through one API, cost optimization
- **Pricing**: Variable (often cheaper than direct provider)
- **Context**: Varies by model
- **Speed**: Varies by model
- **Sign up**: https://openrouter.ai/

**Configuration:**
```bash
OPENROUTER_API_KEY=sk-or-your-key-here
```

**Popular models via OpenRouter:**
- `anthropic/claude-sonnet-4-5` - Claude Sonnet 4.5
- `anthropic/claude-opus-4-6` - Claude Opus 4.6
- `openai/gpt-4-turbo` - GPT-4 Turbo
- `google/gemini-pro` - Gemini Pro
- `meta-llama/llama-3-70b-instruct` - Llama 3 70B

### 4. **Google Gemini**
- **Models**: Gemini Pro, Gemini Pro Vision
- **Best for**: Google ecosystem integration, free tier
- **Pricing**: Free tier available, then $0.50/M tokens
- **Context**: 32k tokens
- **Speed**: Fast
- **Sign up**: https://makersuite.google.com/

**Configuration:**
```bash
GOOGLE_API_KEY=your-google-ai-key-here
```

### 5. **Kimi (Moonshot AI)**
- **Models**: Moonshot v1 (8k, 32k, 128k)
- **Best for**: Chinese language support, long context
- **Pricing**: Competitive pricing for Chinese market
- **Context**: Up to 128k tokens
- **Speed**: Medium
- **Sign up**: https://platform.moonshot.cn/

**Configuration:**
```bash
KIMI_API_KEY=your-kimi-key-here
```

## Setup Instructions

### 1. Configure API Keys

Edit your `.env` file and add the API key(s) for the provider(s) you want to use:

```bash
# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# OpenRouter (access to multiple models)
OPENROUTER_API_KEY=sk-or-xxxxx

# Google Gemini
GOOGLE_API_KEY=xxxxx

# Kimi (Moonshot AI)
KIMI_API_KEY=xxxxx

# Set your default provider
DEFAULT_AI_PROVIDER=anthropic
```

**Note:** You only need to configure the providers you want to use. At least one provider must be configured.

### 2. Restart Backend

After adding API keys, restart the backend server:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

### 3. Verify Providers

Check which providers are available:

```bash
curl http://localhost:8000/api/v1/ai/providers
```

Response:
```json
{
  "default_provider": "anthropic",
  "providers": [
    {
      "id": "anthropic",
      "name": "Claude (Anthropic)",
      "available": true,
      "default_model": "claude-sonnet-4-5-20250929",
      "models": ["claude-sonnet-4-5-20250929", "claude-opus-4-6", ...]
    },
    ...
  ]
}
```

## Using Different Providers

### Via API

You can specify the provider and model when analyzing a deck:

```bash
# Use default provider (from config)
curl -X POST http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}

# Use specific provider
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=openai"

# Use specific model
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=openrouter&model=anthropic/claude-opus-4-6"

# Adjust temperature
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=anthropic&temperature=0.5"
```

### Via Web UI

1. Visit http://localhost:3000/decks
2. Select a deck
3. Choose your preferred AI provider from the dropdown
4. Optionally select a specific model
5. Click "Analyze Deck"

The analysis will show which provider and model were used.

## Cost Comparison

Approximate cost for analyzing one deck (assuming ~2k input tokens, ~1k output tokens):

| Provider | Model | Input Cost | Output Cost | Total |
|----------|-------|------------|-------------|-------|
| Anthropic | Claude Sonnet 4.5 | $0.006 | $0.015 | **$0.021** |
| Anthropic | Claude Opus 4.6 | $0.030 | $0.075 | **$0.105** |
| OpenAI | GPT-4 Turbo | $0.020 | $0.030 | **$0.050** |
| OpenAI | GPT-3.5 Turbo | $0.001 | $0.002 | **$0.003** |
| OpenRouter | Claude Sonnet (cached) | ~$0.004 | ~$0.010 | **~$0.014** |
| Google | Gemini Pro | $0.001 | $0.001 | **$0.002** |

**Note:** Prices are estimates and subject to change. Check provider websites for current pricing.

## Performance Comparison

Based on typical deck analysis tasks:

| Provider | Model | Quality | Speed | Context | Best For |
|----------|-------|---------|-------|---------|----------|
| Anthropic | Claude Sonnet 4.5 | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ | 200k | **Best overall** |
| Anthropic | Claude Opus 4.6 | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | 200k | Most detailed |
| OpenAI | GPT-4 Turbo | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 128k | Fast & reliable |
| OpenAI | GPT-3.5 Turbo | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 16k | Budget option |
| OpenRouter | Various | Varies | Varies | Varies | Flexibility |
| Google | Gemini Pro | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 32k | Free tier |
| Kimi | Moonshot v1 | ⭐⭐⭐ | ⚡⚡⚡ | 128k | Long context |

## Recommendations

### For Production Use
- **Primary**: Anthropic Claude Sonnet 4.5
  - Best balance of quality and cost
  - Excellent at strategic analysis
  - Large context window

- **Fallback**: OpenRouter with Claude Sonnet
  - Similar quality, potentially lower cost
  - Built-in rate limiting and fallbacks

### For Development/Testing
- **Google Gemini Pro**: Free tier, good quality
- **OpenAI GPT-3.5 Turbo**: Very cheap, fast

### For Budget Optimization
- **OpenRouter**: Shop around for best prices
- **Google Gemini**: Free tier for low volume

### For Specific Use Cases
- **Detailed analysis**: Claude Opus 4.6
- **Fast responses**: GPT-4 Turbo or Gemini Pro
- **Long context**: Kimi Moonshot v1 128k
- **Chinese language**: Kimi (Moonshot AI)

## Troubleshooting

### "AI provider not configured" Error

**Problem**: API key is missing or invalid

**Solution**:
1. Check your `.env` file has the correct API key
2. Restart the backend server
3. Verify the key is valid by testing directly with the provider

### Rate Limiting

**Problem**: Too many requests

**Solutions**:
- Use OpenRouter (built-in rate limiting and fallbacks)
- Implement caching for repeated analyses
- Spread requests over time
- Upgrade to higher tier plan

### Quality Issues

**Problem**: Analysis quality is poor

**Solutions**:
- Try a different provider/model
- Adjust temperature (lower = more focused, higher = more creative)
- Use Claude Opus for maximum quality
- Check if deck has sufficient cards for meaningful analysis

### Slow Responses

**Problem**: Analysis takes too long

**Solutions**:
- Use faster models (GPT-4 Turbo, Gemini Pro)
- Reduce deck complexity
- Check provider status page
- Consider using streaming responses (future feature)

## API Reference

### GET /api/v1/ai/providers
List available AI providers

**Response:**
```json
{
  "default_provider": "anthropic",
  "providers": [...]
}
```

### GET /api/v1/ai/providers/{provider}
Get info about specific provider

**Response:**
```json
{
  "id": "anthropic",
  "name": "Claude (Anthropic)",
  "available": true,
  "default_model": "claude-sonnet-4-5-20250929",
  "models": [...]
}
```

### POST /api/v1/ai/analyze-deck/{deck_id}
Analyze deck with AI

**Query Parameters:**
- `provider` (optional): AI provider ID
- `model` (optional): Specific model name
- `temperature` (optional): 0-1, default 0.7

**Response:**
```json
{
  "deck_id": "...",
  "deck_name": "...",
  "provider": "anthropic",
  "model": "claude-sonnet-4-5-20250929",
  "analysis": "...",
  "synergies": [...],
  "cost_analysis": {...},
  "recommendations": [...]
}
```

## Future Enhancements

- [ ] Streaming responses for real-time analysis
- [ ] Provider-specific optimizations
- [ ] Automatic provider failover
- [ ] Cost tracking and budgets
- [ ] Response caching
- [ ] Custom prompts per provider
- [ ] A/B testing between providers

---

**Need Help?**
- Check provider status pages
- Review API documentation
- Open an issue on GitHub
