#!/bin/bash

echo "🤖 OPTCG AI Agent - Provider Testing Script"
echo "==========================================="
echo ""

API_URL="http://localhost:8000/api/v1"

# Check if backend is running
echo "📡 Checking backend status..."
if ! curl -s "${API_URL}/../health" > /dev/null 2>&1; then
    echo "❌ Backend is not running!"
    echo "Start it with: cd backend && uv run uvicorn app.main:app --reload"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# List available providers
echo "🔍 Checking available AI providers..."
PROVIDERS_JSON=$(curl -s "${API_URL}/ai/providers")
echo "$PROVIDERS_JSON" | jq '.'
echo ""

# Extract available providers
AVAILABLE=$(echo "$PROVIDERS_JSON" | jq -r '.providers[] | select(.available==true) | .id')

if [ -z "$AVAILABLE" ]; then
    echo "❌ No AI providers configured!"
    echo ""
    echo "Please add at least one API key to .env:"
    echo "  ANTHROPIC_API_KEY=sk-ant-..."
    echo "  OPENAI_API_KEY=sk-..."
    echo "  OPENROUTER_API_KEY=sk-or-..."
    echo "  GOOGLE_API_KEY=..."
    echo "  KIMI_API_KEY=..."
    echo ""
    echo "See AI_PROVIDERS.md for details"
    exit 1
fi

echo "✅ Available providers:"
echo "$AVAILABLE" | while read provider; do
    PROVIDER_INFO=$(curl -s "${API_URL}/ai/providers/${provider}")
    NAME=$(echo "$PROVIDER_INFO" | jq -r '.name')
    DEFAULT_MODEL=$(echo "$PROVIDER_INFO" | jq -r '.default_model')
    echo "  - ${NAME} (${provider}) - Default: ${DEFAULT_MODEL}"
done
echo ""

# Check if there are any decks to test with
echo "🎴 Checking for test decks..."
DECKS_JSON=$(curl -s "${API_URL}/decks?limit=1")
DECK_ID=$(echo "$DECKS_JSON" | jq -r '.[0].id // empty')

if [ -z "$DECK_ID" ]; then
    echo "⚠️  No decks found in database"
    echo "Create a deck first at: http://localhost:3000/deck-builder"
    echo ""
    echo "Provider configuration is correct, but you need a deck to test analysis."
    exit 0
fi

DECK_NAME=$(echo "$DECKS_JSON" | jq -r '.[0].name')
echo "✅ Found test deck: ${DECK_NAME} (${DECK_ID})"
echo ""

# Offer to test each provider
echo "Would you like to test AI analysis with each provider? (y/n)"
read -r RESPONSE

if [ "$RESPONSE" != "y" ]; then
    echo "Skipping analysis tests"
    exit 0
fi

echo ""
echo "🧪 Testing providers with deck: ${DECK_NAME}"
echo "================================================"
echo ""

echo "$AVAILABLE" | while read provider; do
    echo "Testing ${provider}..."
    START_TIME=$(date +%s)

    RESULT=$(curl -s -X POST "${API_URL}/ai/analyze-deck/${DECK_ID}?provider=${provider}" 2>&1)

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    # Check if request was successful
    if echo "$RESULT" | jq -e '.analysis' > /dev/null 2>&1; then
        MODEL=$(echo "$RESULT" | jq -r '.model // "default"')
        ANALYSIS_LENGTH=$(echo "$RESULT" | jq -r '.analysis | length')
        echo "  ✅ Success (${DURATION}s, ${ANALYSIS_LENGTH} chars, model: ${MODEL})"
    else
        ERROR=$(echo "$RESULT" | jq -r '.detail // "Unknown error"')
        echo "  ❌ Failed: ${ERROR}"
    fi
    echo ""
done

echo "🎉 Provider testing complete!"
echo ""
echo "View results in the web UI: http://localhost:3000/decks"
