#!/bin/bash

echo "🔍 One Piece TCG AI Agent - Verification Script"
echo "==============================================="
echo ""

# Check file structure
echo "📁 Verifying project structure..."
errors=0

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ $1 (missing)"
        ((errors++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
    else
        echo "❌ $1/ (missing)"
        ((errors++))
    fi
}

# Root files
check_file "package.json"
check_file "turbo.json"
check_file "docker-compose.yml"
check_file ".env.example"
check_file "README.md"
check_file "SETUP.md"
check_file "setup.sh"

echo ""

# Backend files
echo "🐍 Backend files:"
check_file "backend/pyproject.toml"
check_file "backend/alembic.ini"
check_file "backend/app/main.py"
check_file "backend/app/config.py"
check_file "backend/app/database.py"
check_file "backend/app/models/card.py"
check_file "backend/app/models/deck.py"
check_file "backend/app/models/user.py"
check_file "backend/app/api/v1/cards.py"
check_file "backend/app/api/v1/decks.py"
check_file "backend/app/api/v1/ai.py"
check_file "backend/app/services/deck_validator.py"
check_file "backend/app/services/card_sync.py"
check_file "backend/app/agents/deck_analyzer_graph.py"
check_dir "backend/alembic/versions"

echo ""

# Frontend files
echo "⚛️  Frontend files:"
check_file "apps/web/package.json"
check_file "apps/web/tsconfig.json"
check_file "apps/web/next.config.js"
check_file "apps/web/tailwind.config.ts"
check_file "apps/web/app/layout.tsx"
check_file "apps/web/app/page.tsx"
check_file "apps/web/app/cards/page.tsx"
check_file "apps/web/app/deck-builder/page.tsx"
check_file "apps/web/app/decks/page.tsx"
check_file "apps/web/lib/api/client.ts"
check_file "apps/web/lib/stores/deckBuilderStore.ts"
check_file "apps/web/types/index.ts"

echo ""

# Summary
if [ $errors -eq 0 ]; then
    echo "✨ All files verified successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run ./setup.sh to install dependencies"
    echo "2. Add ANTHROPIC_API_KEY to .env"
    echo "3. Start the development servers"
else
    echo "⚠️  Found $errors missing files/directories"
    echo "Please check the project structure"
fi
