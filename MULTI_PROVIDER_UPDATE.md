# Multi-Provider AI Support - Update Summary

## Overview

The OPTCG AI Agent now supports **5 different AI providers** for deck analysis, giving users flexibility to choose based on cost, performance, and availability.

## What Changed

### ✅ Backend Changes

#### 1. New Dependencies (backend/pyproject.toml)
Added support for multiple AI provider SDKs:
- `langchain-openai` - OpenAI GPT models
- `langchain-google-genai` - Google Gemini
- `langchain-community` - Community providers
- `openai` - OpenAI SDK
- `google-generativeai` - Google AI SDK

#### 2. New Service: AI Provider Factory (backend/app/services/ai_provider.py)
Created a factory pattern for creating LLM instances:
- `AIProviderFactory.get_llm()` - Creates LLM for any provider
- `AIProviderFactory.get_available_providers()` - Lists configured providers
- `AIProviderFactory.get_provider_info()` - Gets provider details

Supported providers:
- **Anthropic** (Claude Sonnet 4.5, Opus 4.6, Haiku 4.5)
- **OpenAI** (GPT-4 Turbo, GPT-4, GPT-3.5)
- **OpenRouter** (100+ models via single API)
- **Google Gemini** (Gemini Pro, Gemini Pro Vision)
- **Kimi** (Moonshot AI - Chinese language, long context)

#### 3. Updated Deck Analyzer (backend/app/agents/deck_analyzer_graph.py)
- Refactored to accept provider as parameter
- Removed hardcoded Claude instance
- Added `llm` to analysis state
- New `create_deck_analyzer()` function accepts provider/model

#### 4. Updated AI Endpoints (backend/app/api/v1/ai.py)
- `/ai/analyze-deck/{id}` now accepts query parameters:
  - `provider` - Which AI provider to use
  - `model` - Specific model (optional)
  - `temperature` - Generation temperature (0-1)
- New endpoint: `/ai/providers` - Lists available providers
- New endpoint: `/ai/providers/{provider}` - Get provider info

#### 5. Updated Configuration (backend/app/config.py)
Added API key fields for all providers:
- `anthropic_api_key`
- `openai_api_key`
- `openrouter_api_key`
- `google_api_key`
- `kimi_api_key`
- `default_ai_provider` - Default provider to use

### ✅ Frontend Changes

#### 1. Updated API Client (apps/web/lib/api/client.ts)
- `analyzeDeck()` now accepts options object with provider/model
- New methods:
  - `getProviders()` - Fetch available providers
  - `getProviderInfo(provider)` - Get provider details

#### 2. Enhanced Decks Page (apps/web/app/decks/page.tsx)
- Added provider selection dropdown
- Added model selection dropdown (when provider has multiple models)
- Shows which provider/model was used for analysis
- Uses mutation instead of query for better control
- Displays provider availability status

### ✅ Configuration Changes

#### 1. Environment Variables (.env.example)
Added API key fields for all providers with documentation links:
```bash
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
OPENROUTER_API_KEY=...
GOOGLE_API_KEY=...
KIMI_API_KEY=...
DEFAULT_AI_PROVIDER=anthropic
```

### ✅ Documentation

#### 1. New Guide: AI_PROVIDERS.md
Comprehensive guide covering:
- All 5 supported providers
- Setup instructions
- Cost comparison
- Performance comparison
- Recommendations for different use cases
- Troubleshooting
- API reference

#### 2. Updated README.md
- Mentions multi-provider support
- Lists all 5 providers

#### 3. Updated QUICKSTART.md
- Shows how to configure different providers
- Links to detailed AI_PROVIDERS.md guide

## How to Use

### 1. Configure API Keys

Edit `.env` and add API key(s) for provider(s) you want:

```bash
# Use Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Or use OpenAI
OPENAI_API_KEY=sk-xxxxx

# Or use OpenRouter (access to 100+ models)
OPENROUTER_API_KEY=sk-or-xxxxx

# Or use Google Gemini (free tier available)
GOOGLE_API_KEY=xxxxx

# Or use Kimi (Chinese language support)
KIMI_API_KEY=xxxxx

# Set default
DEFAULT_AI_PROVIDER=anthropic
```

**Note:** At least one provider must be configured.

### 2. Install New Dependencies

```bash
cd backend
uv sync
```

### 3. Restart Backend

```bash
cd backend
uv run uvicorn app.main:app --reload
```

### 4. Use in Web UI

1. Visit http://localhost:3000/decks
2. Select a deck
3. Choose AI provider from dropdown
4. Optionally select specific model
5. Click "Analyze Deck"

### 5. Use via API

```bash
# Use default provider
curl -X POST http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}

# Use specific provider
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=openai"

# Use specific model
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=openrouter&model=anthropic/claude-opus-4-6"

# List available providers
curl http://localhost:8000/api/v1/ai/providers
```

## Files Changed

### Backend
- ✅ `backend/pyproject.toml` - Added dependencies
- ✅ `backend/app/config.py` - Added API key config
- ✅ `backend/app/services/ai_provider.py` - **NEW** - Provider factory
- ✅ `backend/app/agents/deck_analyzer_graph.py` - Refactored for multi-provider
- ✅ `backend/app/api/v1/ai.py` - Added provider selection

### Frontend
- ✅ `apps/web/lib/api/client.ts` - Updated API client
- ✅ `apps/web/app/decks/page.tsx` - Added provider UI

### Configuration
- ✅ `.env.example` - Added all provider API keys

### Documentation
- ✅ `AI_PROVIDERS.md` - **NEW** - Comprehensive guide
- ✅ `README.md` - Updated features
- ✅ `QUICKSTART.md` - Updated setup
- ✅ `MULTI_PROVIDER_UPDATE.md` - **NEW** - This file

## Benefits

### 1. **Flexibility**
- Choose provider based on needs
- Switch providers without code changes
- Use different providers for different decks

### 2. **Cost Optimization**
- Use cheaper providers for testing
- Use premium providers for important analysis
- OpenRouter often has better prices

### 3. **Reliability**
- Fallback to other providers if one is down
- Avoid rate limits by distributing load
- Use multiple providers in production

### 4. **Performance**
- Choose faster models when speed matters
- Use more powerful models for detailed analysis
- Optimize based on use case

### 5. **Free Tier**
- Google Gemini offers free tier
- Good for development and testing
- Reduces costs significantly

## Cost Comparison

Approximate cost per deck analysis:

| Provider | Model | Cost |
|----------|-------|------|
| Google Gemini | Gemini Pro | **$0.002** ⭐ Cheapest |
| OpenAI | GPT-3.5 Turbo | $0.003 |
| OpenRouter | Claude Sonnet | ~$0.014 |
| Anthropic | Claude Sonnet 4.5 | $0.021 ✨ Recommended |
| OpenAI | GPT-4 Turbo | $0.050 |
| Anthropic | Claude Opus 4.6 | $0.105 🏆 Best Quality |

## Performance Comparison

| Provider | Model | Quality | Speed |
|----------|-------|---------|-------|
| Anthropic | Claude Sonnet 4.5 | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ |
| Anthropic | Claude Opus 4.6 | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ |
| OpenAI | GPT-4 Turbo | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ |
| Google | Gemini Pro | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ |
| OpenAI | GPT-3.5 Turbo | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ |

## Recommendations

### For Production
- **Primary**: Anthropic Claude Sonnet 4.5
- **Fallback**: OpenRouter with Claude Sonnet

### For Development
- **Budget**: Google Gemini Pro (free tier)
- **Testing**: OpenAI GPT-3.5 Turbo

### For Specific Needs
- **Best Quality**: Claude Opus 4.6
- **Fastest**: GPT-4 Turbo or Gemini Pro
- **Best Value**: OpenRouter
- **Chinese Language**: Kimi (Moonshot AI)

## Backward Compatibility

✅ **Fully backward compatible!**

- Default provider is still Anthropic (Claude)
- If no provider specified, uses `DEFAULT_AI_PROVIDER` from config
- Existing code continues to work without changes
- Old analysis results remain valid

## Testing

### 1. Check Available Providers

```bash
curl http://localhost:8000/api/v1/ai/providers
```

### 2. Test Each Provider

```bash
# Test Anthropic
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=anthropic"

# Test OpenAI
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=openai"

# Test OpenRouter
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=openrouter"

# Test Gemini
curl -X POST "http://localhost:8000/api/v1/ai/analyze-deck/{deck_id}?provider=gemini"
```

### 3. Test in UI

1. Visit http://localhost:3000/decks
2. Try each available provider
3. Compare results and speed

## Troubleshooting

### "AI provider not configured"
- Check `.env` has the API key
- Restart backend server
- Verify key is valid

### Provider not showing in UI
- Check provider is configured in `.env`
- Check `/api/v1/ai/providers` shows it as available
- Restart backend after adding key

### Rate limit errors
- Use different provider
- Implement caching (future feature)
- Upgrade provider plan

## Future Enhancements

- [ ] Streaming responses
- [ ] Automatic provider failover
- [ ] Response caching
- [ ] Cost tracking
- [ ] Provider A/B testing
- [ ] Custom prompts per provider

---

**Questions?** See `AI_PROVIDERS.md` for detailed documentation.
