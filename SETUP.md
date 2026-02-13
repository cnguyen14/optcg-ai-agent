# Setup Instructions

## Step-by-Step Setup Guide

### 1. Install Prerequisites

#### Install Node.js 18+
- Visit https://nodejs.org/ and download the LTS version
- Or use nvm: `nvm install 18`

#### Install Python 3.11+
```bash
# macOS
brew install python@3.11

# Ubuntu/Debian
sudo apt-get install python3.11

# Windows
# Download from https://www.python.org/downloads/
```

#### Install Docker Desktop
- Visit https://www.docker.com/products/docker-desktop/
- Download and install for your platform

#### Install uv (Python package manager)
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify installation
uv --version
```

### 2. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
cd optcg-ai-agent

# Install root dependencies
npm install

# Install frontend dependencies
cd apps/web
npm install
cd ../..

# Install backend dependencies
cd backend
uv sync
cd ..
```

### 3. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your favorite editor
nano .env  # or vim, code, etc.
```

**Required environment variables:**

```env
# Get your API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Database (default is fine for local dev)
DATABASE_URL=postgresql+asyncpg://optcg:dev_password@localhost:5432/optcg_dev

# Redis (default is fine for local dev)
REDIS_URL=redis://localhost:6379

# Qdrant (default is fine for local dev)
QDRANT_URL=http://localhost:6333

# Secret key (generate a random string for production)
SECRET_KEY=your-secret-key-change-in-production
```

### 4. Start Docker Services

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                 STATUS
# optcg_postgres       Up (healthy)
# optcg_redis          Up (healthy)
# optcg_qdrant         Up (healthy)

# If services aren't healthy, check logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs qdrant
```

### 5. Initialize Database

```bash
cd backend

# Run database migrations
uv run alembic upgrade head

# You should see output like:
# INFO  [alembic.runtime.migration] Running upgrade  -> xxxxx, Initial schema
# INFO  [alembic.runtime.migration] Running upgrade xxxxx -> yyyyy, ...

cd ..
```

### 6. Seed Card Data (Optional)

This step syncs cards from the One Piece TCG API. It may take a few minutes.

```bash
# Make sure backend is running
cd backend
uv run uvicorn app.main:app --reload &

# In another terminal, trigger sync
curl -X POST http://localhost:8000/api/v1/cards/sync

# You should see a response like:
# {"success": true, "message": "Cards synced successfully", "stats": {...}}

# Stop the backend process
# Press Ctrl+C in the backend terminal
```

### 7. Start Development Servers

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev

# You should see:
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3000
# - Ready in X.Xs
```

### 8. Verify Installation

Open your browser and visit:

1. **Frontend**: http://localhost:3000
   - You should see the OPTCG AI Agent homepage

2. **Backend API Docs**: http://localhost:8000/docs
   - You should see the FastAPI interactive documentation

3. **Test Card API**:
   ```bash
   curl http://localhost:8000/api/v1/cards?limit=5
   # Should return JSON array of cards
   ```

### 9. Common Issues

#### Port Already in Use

```bash
# If port 3000 is in use
cd apps/web
PORT=3001 npm run dev

# If port 8000 is in use
cd backend
uv run uvicorn app.main:app --reload --port 8001
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# If not running, start it
docker-compose up -d postgres

# Check logs
docker-compose logs postgres
```

#### ANTHROPIC_API_KEY Not Set

Make sure your `.env` file exists and contains:
```env
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the backend server after updating `.env`.

#### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
cd backend
uv run alembic upgrade head
```

### 10. Next Steps

Now that everything is running:

1. **Browse Cards**: Visit http://localhost:3000/cards
2. **Build a Deck**: Visit http://localhost:3000/deck-builder
3. **View API Docs**: Visit http://localhost:8000/docs

## Production Deployment

For production deployment:

1. Update `.env` with production values:
   - Strong `SECRET_KEY`
   - Production database URL
   - Production Anthropic API key

2. Set `ENVIRONMENT=production`

3. Build frontend:
   ```bash
   cd apps/web
   npm run build
   npm start
   ```

4. Run backend with gunicorn:
   ```bash
   cd backend
   uv run gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

5. Use a reverse proxy (nginx/caddy) for HTTPS

6. Set up proper database backups

7. Configure monitoring and logging

## Development Tips

- Use `turbo dev` to run all dev servers at once
- Backend has hot-reload enabled - changes auto-restart
- Frontend has hot-module-replacement - changes reflect instantly
- Check `docker-compose logs -f` to monitor service logs
- Use API docs at `/docs` to test endpoints interactively
