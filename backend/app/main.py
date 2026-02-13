from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings as app_settings
from app.api.v1 import cards, decks, ai, chat
from app.api.v1 import settings as settings_router_module
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="OPTCG AI Agent API",
    description="One Piece Trading Card Game AI-powered analysis and deck building API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cards.router, prefix=f"{app_settings.api_v1_prefix}/cards", tags=["cards"])
app.include_router(decks.router, prefix=f"{app_settings.api_v1_prefix}/decks", tags=["decks"])
app.include_router(ai.router, prefix=f"{app_settings.api_v1_prefix}/ai", tags=["ai"])
app.include_router(chat.router, prefix=f"{app_settings.api_v1_prefix}/chat", tags=["chat"])
app.include_router(settings_router_module.router, prefix=f"{app_settings.api_v1_prefix}/settings", tags=["settings"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OPTCG AI Agent API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=app_settings.debug,
    )
