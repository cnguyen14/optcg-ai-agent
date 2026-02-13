# One Piece TCG AI Agent

AI-powered deck building and analysis tool for One Piece Trading Card Game, built with Next.js, FastAPI, and Claude Sonnet 4.6.

## Features

- 🎴 **Card Browser**: Explore the complete One Piece TCG card database
- 🛠️ **Deck Builder**: Create and validate decks with real-time feedback
- 🤖 **Multi-Provider AI Analysis**: Choose from 5 AI providers:
  - **Anthropic** (Claude Sonnet 4.5, Opus 4.6, Haiku 4.5)
  - **OpenAI** (GPT-4 Turbo, GPT-4, GPT-3.5)
  - **OpenRouter** (100+ models including Claude, GPT-4, Gemini, Llama)
  - **Google Gemini** (Gemini Pro, free tier available)
  - **Kimi** (Moonshot AI, long context support)
- 📊 **Synergy Detection**: Automatically identify powerful card combinations
- 📈 **Cost Curve Analysis**: Optimize your DON!! progression
- ✅ **Deck Validation**: Automatic validation against official OPTCG rules

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query**
- **Zustand**

### Backend
- **FastAPI** (Python 3.11+)
- **SQLAlchemy 2.0** (async)
- **PostgreSQL 16**
- **Redis 7**
- **LangGraph** + **Claude Sonnet 4.6**
- **Qdrant** (vector database)

### Infrastructure
- **Turborepo** (monorepo)
- **Docker Compose** (local development)
- **uv** (Python package management)

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker Desktop
- uv (Python package manager)

## Quick Start

### 1. Install uv (Python package manager)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. Clone and Setup

```bash
# Install Node dependencies
npm install

# Setup backend
cd backend
uv sync
cd ..
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your_api_key_here
```

### 4. Start Services

```bash
# Start Docker services (PostgreSQL, Redis, Qdrant)
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

### 5. Initialize Database

```bash
# Run migrations
cd backend
uv run alembic upgrade head

# Sync cards from OPTCG API (optional)
# This will populate the database with card data
curl -X POST http://localhost:8000/api/v1/cards/sync
cd ..
```

### 6. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
uv run uvicorn app.main:app --reload

# Terminal 2: Start frontend
cd apps/web
npm run dev
```

Visit http://localhost:3000 to see the application!

## Project Structure

```
optcg-ai-agent/
├── apps/
│   └── web/                  # Next.js frontend
│       ├── app/              # App router pages
│       ├── components/       # React components
│       ├── lib/             # API client, stores
│       └── types/           # TypeScript types
│
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   │   ├── cards.py     # Card endpoints
│   │   │   ├── decks.py     # Deck endpoints
│   │   │   └── ai.py        # AI analysis
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   │   ├── deck_validator.py
│   │   │   ├── card_sync.py
│   │   │   └── synergy_detector.py
│   │   └── agents/          # LangGraph agents
│   │       └── deck_analyzer_graph.py
│   ├── alembic/             # Database migrations
│   └── pyproject.toml       # Python dependencies
│
├── packages/                # Shared packages
├── docker-compose.yml       # Local services
└── turbo.json              # Turborepo config
```

## API Endpoints

### Cards
- `GET /api/v1/cards` - List cards with filtering
- `GET /api/v1/cards/{id}` - Get card details
- `GET /api/v1/cards/leaders/` - List leaders
- `POST /api/v1/cards/sync` - Sync cards from OPTCG API

### Decks
- `GET /api/v1/decks` - List decks
- `POST /api/v1/decks` - Create deck
- `GET /api/v1/decks/{id}` - Get deck details
- `PATCH /api/v1/decks/{id}` - Update deck
- `DELETE /api/v1/decks/{id}` - Delete deck
- `POST /api/v1/decks/{id}/validate` - Validate deck

### AI Analysis
- `POST /api/v1/ai/analyze-deck/{id}` - Full AI analysis
- `POST /api/v1/ai/quick-tips/{id}` - Quick tips

## Development

### Running Tests

```bash
# Backend tests
cd backend
uv run pytest

# Frontend tests
cd apps/web
npm test
```

### Database Migrations

```bash
# Create new migration
cd backend
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Rollback
uv run alembic downgrade -1
```

### Linting & Formatting

```bash
# Backend
cd backend
uv run black .
uv run ruff check .

# Frontend
cd apps/web
npm run lint
```

## Deck Validation Rules

The application enforces official One Piece TCG rules:

1. ✅ Exactly 1 Leader card
2. ✅ Exactly 50 cards in deck
3. ✅ Maximum 4 copies of any card
4. ✅ Color identity must match leader

## AI Analysis Features

The LangGraph agent provides:

- **Synergy Analysis**: Identifies card combos and tribal synergies
- **Cost Curve Evaluation**: Analyzes DON!! progression
- **Recommendations**: Suggests cards to add/remove
- **Strategy Tips**: Provides piloting advice

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres
```

### API Key Issues

Make sure your `.env` file has:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Port Conflicts

If ports 3000, 8000, 5432, 6379, or 6333 are in use:
```bash
# Stop Docker services
docker-compose down

# Update ports in docker-compose.yml
```

## Next Steps

- [ ] Implement user authentication
- [ ] Add tournament data scraping (Celery)
- [ ] Build meta tier list
- [ ] Add deck comparison tool
- [ ] Implement collection tracking
- [ ] Create mobile app

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
