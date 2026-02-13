# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites Check
```bash
node --version    # Need 18+
python3 --version # Need 3.11+
docker --version  # Need Docker
uv --version      # Need uv package manager
```

If `uv` is missing:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Setup

```bash
# 1. Run automated setup (installs deps, starts Docker)
./setup.sh

# 2. Add at least one AI provider API key
# See AI_PROVIDERS.md for detailed guide
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env
# OR
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
# OR use OpenRouter for access to multiple models
echo "OPENROUTER_API_KEY=sk-or-your-key-here" >> .env

# 3. Start backend (Terminal 1)
cd backend
uv run uvicorn app.main:app --reload

# 4. Start frontend (Terminal 2)
cd apps/web
npm run dev
```

### Verify It Works

1. **Frontend**: http://localhost:3000
2. **API Docs**: http://localhost:8000/docs
3. **Test API**:
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"healthy"}
   ```

### Optional: Load Card Data

```bash
# Sync cards from OPTCG API (takes 1-2 min)
curl -X POST http://localhost:8000/api/v1/cards/sync
```

## 🎮 Quick Tour

### 1. Browse Cards
- Visit http://localhost:3000/cards
- Search for "Luffy"
- Filter by color (Red, Blue, etc.)

### 2. Build a Deck
- Visit http://localhost:3000/deck-builder
- Click "Leaders" and select a leader
- Click "Cards" and add cards to your deck
- Aim for 50 cards total
- Click "Save Deck"

### 3. Get AI Analysis
- Visit http://localhost:3000/decks
- Click "Analyze with AI" on any deck
- Wait 10-15 seconds for Claude to analyze
- Read the comprehensive deck report!

## 🔧 Common Commands

### Backend
```bash
cd backend

# Start server
uv run uvicorn app.main:app --reload

# Run migrations
uv run alembic upgrade head

# Create new migration
uv run alembic revision --autogenerate -m "description"

# Run tests
uv run pytest
```

### Frontend
```bash
cd apps/web

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Docker
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Reset database (WARNING: deletes data)
docker-compose down -v
docker-compose up -d
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Backend on different port
cd backend
uv run uvicorn app.main:app --reload --port 8001

# Frontend on different port
cd apps/web
PORT=3001 npm run dev
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### "Module not found" errors
```bash
# Reinstall dependencies
npm install
cd apps/web && npm install
cd backend && uv sync
```

## 📚 Documentation

- **Full Setup**: See `SETUP.md`
- **Features**: See `README.md`
- **What's Built**: See `IMPLEMENTATION_SUMMARY.md`
- **API Reference**: http://localhost:8000/docs (when backend is running)

## 🎯 What You Can Do Now

✅ Browse 1000+ One Piece TCG cards
✅ Build legal 50-card decks
✅ Get AI-powered deck analysis
✅ View synergies and cost curves
✅ Save and share decks

## 🔮 Coming Soon

⏳ Tournament meta tracking
⏳ User authentication
⏳ Collection tracking
⏳ Matchup analysis
⏳ Draft simulator

---

**Need Help?** Check the full `SETUP.md` guide or open an issue on GitHub.
