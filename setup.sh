#!/bin/bash

set -e

echo "🎴 One Piece TCG AI Agent - Setup Script"
echo "========================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed. Visit https://nodejs.org/"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is not installed. Visit https://www.docker.com/"; exit 1; }
command -v uv >/dev/null 2>&1 || { echo "❌ uv is not installed. Run: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }

echo "✅ All prerequisites installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd apps/web && npm install && cd ../..
cd backend && uv sync && cd ..
echo "✅ Dependencies installed"
echo ""

# Setup environment
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d
echo "⏳ Waiting for services to be healthy..."
sleep 10
docker-compose ps
echo "✅ Docker services started"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
cd backend
uv run alembic upgrade head
cd ..
echo "✅ Database initialized"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your ANTHROPIC_API_KEY"
echo "2. Start backend: cd backend && uv run uvicorn app.main:app --reload"
echo "3. Start frontend: cd apps/web && npm run dev"
echo "4. Visit http://localhost:3000"
echo ""
echo "Optional: Sync cards from OPTCG API"
echo "curl -X POST http://localhost:8000/api/v1/cards/sync"
