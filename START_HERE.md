# 🚀 Your OPTCG AI Agent is Ready!

## ✅ What's Been Set Up

1. ✅ **Dependencies Installed**
   - Node.js packages (frontend)
   - Python packages (backend)
   - All AI provider libraries

2. ✅ **Docker Services Running** (custom ports to avoid conflicts)
   - PostgreSQL: `localhost:5433` (instead of 5432)
   - Redis: `localhost:6380` (instead of 6379)
   - Qdrant: `localhost:6333`

3. ✅ **Database Initialized**
   - All tables created (cards, leaders, decks, users)
   - Migrations configured

4. ✅ **Configuration Files**
   - `.env` created with database connections
   - `docker-compose.yml` configured

## ⚠️ IMPORTANT: Add an AI API Key

Before starting the servers, you MUST add at least one AI provider API key to `.env`:

```bash
# Edit .env and add ONE of these:

# Option 1: Anthropic (Recommended)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Option 2: OpenAI
OPENAI_API_KEY=sk-your-key-here

# Option 3: OpenRouter (Best value - access to 100+ models)
OPENROUTER_API_KEY=sk-or-your-key-here

# Option 4: Google Gemini (Free tier available)
GOOGLE_API_KEY=your-google-key-here

# Option 5: Kimi (Moonshot AI)
KIMI_API_KEY=your-kimi-key-here
```

### Where to Get API Keys

- **Anthropic**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **OpenRouter**: https://openrouter.ai/keys (Recommended - cheapest!)
- **Google**: https://makersuite.google.com/app/apikey
- **Kimi**: https://platform.moonshot.cn/console/api-keys

## 🚀 Start the Application

### Terminal 1: Start Backend

```bash
cd backend
uv run uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Terminal 2: Start Frontend

```bash
cd apps/web
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

## 🎯 Access the Application

1. **Frontend**: http://localhost:3000
   - Home page with features overview
   - Card browser
   - Deck builder
   - AI analysis

2. **Backend API**: http://localhost:8000/docs
   - Interactive API documentation
   - Test endpoints

3. **Health Check**: http://localhost:8000/health
   - Should return `{"status":"healthy"}`

## 📚 What You Can Do

### 1. Browse Cards
- Visit: http://localhost:3000/cards
- Search and filter One Piece TCG cards
- View card details

### 2. Build a Deck
- Visit: http://localhost:3000/deck-builder
- Select a leader
- Add cards (up to 4 copies each)
- Must have exactly 50 cards
- Save your deck

### 3. AI Analysis (Requires API Key!)
- Visit: http://localhost:3000/decks
- Select a deck
- Choose AI provider
- Click "Analyze with AI"
- Get strategic insights!

## 🔧 Troubleshooting

### Backend won't start
```bash
# Make sure you're in the backend directory
cd backend

# Check if .env has correct database URL
cat ../.env | grep DATABASE_URL
# Should show: postgresql+asyncpg://optcg:dev_password@localhost:5433/optcg_dev

# Start backend
uv run uvicorn app.main:app --reload
```

### Frontend won't start
```bash
# Make sure you're in apps/web
cd apps/web

# Reinstall if needed
npm install

# Start frontend
npm run dev
```

### "AI provider not configured" error
- Edit `.env` in the project root
- Add at least one AI provider API key
- Restart the backend server
- Refresh the frontend

### Docker services not running
```bash
# Check status
docker-compose ps

# Restart if needed
docker-compose restart

# View logs
docker-compose logs -f
```

## 📖 Next Steps

1. **Add API Key** (Required for AI analysis)
   - Edit `.env`
   - Add your chosen provider key
   - Restart backend

2. **Sync Cards** (Optional - populates database)
   ```bash
   curl -X POST http://localhost:8000/api/v1/cards/sync
   ```
   This will fetch 1000+ cards from the OPTCG API

3. **Test AI Providers**
   ```bash
   ./test-providers.sh
   ```

4. **Build Your First Deck**
   - Go to http://localhost:3000/deck-builder
   - Select a leader
   - Add 50 cards
   - Save and analyze!

## 📚 Documentation

- **AI Providers Guide**: `AI_PROVIDERS.md`
- **Setup Details**: `SETUP.md`
- **Quick Start**: `QUICKSTART.md`
- **Full README**: `README.md`

## 🎉 You're Ready!

Your OPTCG AI Agent is fully set up and ready to use. Just add an AI API key and start the servers!

---

**Need Help?**
- Check the documentation files
- Run `./test-providers.sh` to verify setup
- Visit http://localhost:8000/docs for API reference
