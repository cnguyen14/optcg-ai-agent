from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )

    # Database
    database_url: str = "postgresql+asyncpg://optcg:dev_password@localhost:5432/optcg_dev"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"

    # AI Provider API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    google_api_key: str = ""  # For Gemini
    kimi_api_key: str = ""  # Moonshot AI / Kimi

    # Application
    secret_key: str = "dev-secret-key-change-in-production"
    default_ai_provider: str = "anthropic"  # anthropic, openai, openrouter, gemini, kimi
    environment: str = "development"
    debug: bool = True

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # API
    api_v1_prefix: str = "/api/v1"


settings = Settings()
