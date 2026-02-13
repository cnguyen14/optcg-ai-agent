# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

One Piece TCG AI Agent - An AI-powered deck building and analysis tool for One Piece Trading Card Game. Built as a **Turborepo monorepo** with Next.js frontend and FastAPI backend, featuring multi-provider AI support (Anthropic, OpenAI, OpenRouter, Gemini, Kimi) and LangGraph-based deck analysis.

## Architecture

### Monorepo Structure

- **apps/web** - Next.js 14 (App Router) frontend with TypeScript, Tailwind, TanStack Query, Zustand
- **backend/** - FastAPI backend with SQLAlchemy 2.0 async, PostgreSQL, Redis, Qdrant
- **packages/** - Shared code (currently minimal)

### Key Architectural Patterns

#### 1. Multi-Provider AI System

The application supports 5 AI providers through a factory pattern (`backend/app/services/ai_provider.py`):

- **AIProviderFactory** - Creates LLM instances dynamically based on provider string
- All providers return LangChain-compatible chat models
- Provider availability is checked at runtime (requires API keys in `.env`)
- Default provider is configurable via `DEFAULT_AI_PROVIDER` environment variable

**Important**: When working with AI features:
- The LLM instance is created in `create_deck_analyzer()` and passed through the graph state
- Each node in the LangGraph receives the same LLM instance from state
- Provider selection happens at the API endpoint level, not within the graph

#### 2. LangGraph Agent Workflow

Deck analysis uses a **sequential pipeline** (`backend/app/agents/deck_analyzer_graph.py`):

```
synergy_analyzer → cost_analyzer → recommendations → synthesizer
```

**State Pattern**: All nodes receive and return `DeckAnalysisState` which includes:
- `deck_data` - Full deck information
- `llm` - The AI provider instance to use
- `card_synergies`, `cost_analysis`, `recommendations` - Accumulated analysis
- `final_report` - Final markdown output

**Critical**: The graph is **stateless across requests**. Each analysis creates a new graph instance with a fresh LLM.

#### 3. Deck Building with Zustand

Frontend uses Zustand for local deck state (`apps/web/lib/stores/deckBuilderStore.ts`):

- **Client-side validation**: 4-card limit enforced in store
- **Computed values**: `getTotalCards()`, `getCostCurve()`, `getColorDistribution()`
- **No persistence until save**: Deck exists only in store until explicitly saved via API

The store is **not synced** with server automatically - call the API to persist.

#### 4. Database Models & Relationships

Key models in `backend/app/models/`:

- **Card** - Individual cards from OPTCG API
- **Leader** - Leader cards (subset of cards with `life` attribute)
- **Deck** - User-created decks with metadata
- **DeckCard** - Join table for deck ↔ card with quantity

**Important**: Leaders are **separate from cards** in the database despite representing cards. They have additional fields (`life`, `colors`) and are stored in a different table.

#### 5. One Piece TCG Validation Rules

`DeckValidator` enforces official OPTCG rules:

1. Exactly 1 leader
2. Exactly 50 cards in deck
3. Max 4 copies of any card
4. **Color identity**: Card colors must be subset of leader colors

Multi-color cards (e.g., "Red,Blue") are parsed and each color checked against leader.

## Development Commands

### Initial Setup

```bash
# Install all dependencies (root + apps)
npm install

# Setup backend (Python 3.11+)
cd backend
uv sync
cd ..

# Start Docker services
docker-compose up -d

# Initialize database
cd backend
uv run alembic upgrade head
cd ..
```

### Development Servers

**Note**: This project uses **custom ports** to avoid conflicts:

- PostgreSQL: `5433` (not 5432)
- Redis: `6380` (not 6379)
- Backend: `8002` (not 8000) - **Start manually on this port**
- Frontend: `3000`

```bash
# Backend (Terminal 1)
cd backend
uv run uvicorn app.main:app --reload --port 8002

# Frontend (Terminal 2)
cd apps/web
npm run dev
```

**Frontend API Configuration**: The frontend expects `NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1` in `apps/web/.env.local`.

### Database Operations

```bash
cd backend

# Create migration
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1

# View migration history
uv run alembic history
```

### Testing

```bash
# Backend tests
cd backend
uv run pytest

# Run specific test file
uv run pytest tests/test_deck_validator.py

# Frontend tests
cd apps/web
npm test
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

# Format everything (from root)
npm run format
```

### Turborepo Commands

```bash
# Run dev across all apps
turbo dev

# Build all apps
turbo build

# Lint all apps
turbo lint

# Clean build artifacts
turbo clean
```

## Environment Configuration

### Required Environment Variables

**Backend** (`.env` in project root):
```bash
# Custom ports (different from defaults!)
DATABASE_URL=postgresql+asyncpg://optcg:dev_password@localhost:5433/optcg_dev
REDIS_URL=redis://localhost:6380

# At least one AI provider key required
ANTHROPIC_API_KEY=sk-ant-...
# or OPENAI_API_KEY, OPENROUTER_API_KEY, GOOGLE_API_KEY, KIMI_API_KEY

DEFAULT_AI_PROVIDER=anthropic
```

**Frontend** (`apps/web/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
```

**Critical**: The `.env.example` file shows **default ports** (5432, 6379, 8000), but this project uses **custom ports** (5433, 6380, 8002) configured in `docker-compose.yml` and actual `.env`.

## Key Workflows

### Adding a New AI Provider

1. Add API key to `backend/app/config.py` Settings class
2. Add provider factory method in `backend/app/services/ai_provider.py`
3. Update `get_available_providers()` with provider metadata
4. Add provider to `AIProvider` Literal type
5. Frontend will auto-discover via `/api/v1/ai/providers` endpoint

### Syncing Cards from OPTCG API

```bash
# Start backend first
cd backend
uv run uvicorn app.main:app --reload --port 8002

# Trigger sync (in another terminal)
curl -X POST http://localhost:8002/api/v1/cards/sync
```

This populates the database with cards from the official OPTCG API.

### Creating a Deck Analysis

The analysis flow:

1. Frontend calls `POST /api/v1/ai/analyze-deck/{deck_id}?provider=anthropic&model=claude-sonnet-4-5`
2. Backend loads deck with all cards via SQLAlchemy relationships
3. `create_deck_analyzer(provider, model)` creates LLM + compiled graph
4. Graph executes: synergy → cost → recommendations → synthesizer
5. Returns final markdown report

**Performance**: Analysis takes ~10-30 seconds depending on provider and deck complexity.

## Important Notes

### Docker Service Ports

The `docker-compose.yml` uses **non-default ports** to avoid conflicts with other services on the development machine:

- PostgreSQL: Host `5433` → Container `5432`
- Redis: Host `6380` → Container `6379`
- Qdrant: Host `6333` → Container `6333` (default)

Update connection strings in `.env` to match these ports.

### Frontend API Client

The API client (`apps/web/lib/api/client.ts`) uses the `NEXT_PUBLIC_API_URL` environment variable. If the backend port changes, update this in `apps/web/.env.local`.

### Alembic Configuration

Alembic is configured to use **asyncpg** driver (not psycopg2) in `backend/alembic.ini`:

```ini
sqlalchemy.url = postgresql+asyncpg://optcg:dev_password@localhost:5433/optcg_dev
```

This must match the async driver used by SQLAlchemy in the application.

### LangGraph State Management

The `DeckAnalysisState` TypedDict is **not validated** by Pydantic - it's a pure Python dict. Type safety is enforced by TypeScript-style typing, not runtime validation. Be careful when modifying state structure to update all nodes.

### Zustand Store Persistence

The deck builder store (`useDeckBuilder`) does **not persist to localStorage**. Refreshing the page loses the deck. To save, user must explicitly click "Save Deck" which calls the API.

## Common Issues

### "Port already allocated" during docker-compose up

This project intentionally uses custom ports (5433, 6380) to avoid conflicts. If you still see this error, check what's using those ports:

```bash
lsof -i :5433
lsof -i :6380
```

### Frontend shows "Failed to fetch" errors

- Check backend is running on port **8002** (not 8000)
- Verify `apps/web/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1`
- Check CORS settings in `backend/app/main.py` allow `http://localhost:3000`

### AI Analysis returns empty report

- Verify at least one AI provider API key is set in `.env`
- Check backend logs for LLM errors
- Ensure the provider specified in the request has a valid API key

### Alembic "No such driver: asyncpg"

Install asyncpg in the backend environment:

```bash
cd backend
uv add asyncpg
```

## Tech Stack Quick Reference

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Backend**: FastAPI, SQLAlchemy 2.0 async, Pydantic, LangGraph, LangChain
- **Database**: PostgreSQL 16 (via asyncpg)
- **Cache**: Redis 7
- **Vector DB**: Qdrant (for future card embeddings)
- **AI**: Multi-provider (Anthropic Claude, OpenAI GPT, OpenRouter, Gemini, Kimi)
- **Build**: Turborepo, uv (Python), npm (Node)
