import logging
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_provider import AIProviderFactory, PROVIDER_KEY_MAP
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ValidateKeyRequest(BaseModel):
    provider: str
    api_key: str
    local_url: str | None = None  # Only for provider="local"
    model: str | None = None  # Optional model for local provider test


class ValidateKeyResponse(BaseModel):
    valid: bool
    provider: str
    error: str | None = None


class ProvidersRequest(BaseModel):
    api_keys: dict[str, str] | None = None
    local_url: str | None = None


def _normalize_local_url(url: str) -> str:
    """Ensure local URL ends with /v1 for OpenAI-compatible servers."""
    url = url.rstrip("/")
    if not url.endswith("/v1"):
        url = url + "/v1"
    return url


@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_key(data: ValidateKeyRequest):
    """
    Validate an API key by attempting to create an LLM instance
    and making a minimal call. For local providers, tests the connection
    via /v1/models first (no model name required).
    """
    try:
        if data.provider == "local":
            # For local providers, test connection via /v1/models endpoint
            url = _normalize_local_url(
                data.local_url or "http://localhost:11434/v1"
            )
            key = data.api_key or "not-needed"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{url}/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                resp.raise_for_status()
            return ValidateKeyResponse(valid=True, provider=data.provider)

        llm = AIProviderFactory.get_llm(
            provider=data.provider,
            api_keys={data.provider: data.api_key} if data.api_key else None,
            local_url=data.local_url,
        )
        # Make a tiny test call to verify the key/connection works
        from langchain_core.messages import HumanMessage
        await llm.ainvoke([HumanMessage(content="Hi")])
        return ValidateKeyResponse(valid=True, provider=data.provider)
    except Exception as e:
        error_msg = str(e)
        # Clean up common error messages
        if "401" in error_msg or "authentication" in error_msg.lower() or "invalid" in error_msg.lower():
            error_msg = "Invalid API key"
        elif "rate" in error_msg.lower():
            error_msg = "Rate limited — key is valid but rate-limited"
        elif "connect" in error_msg.lower() or "refused" in error_msg.lower():
            error_msg = "Connection failed — is the server running?"
        logger.info(f"Key validation failed for {data.provider}: {error_msg}")
        return ValidateKeyResponse(
            valid=False,
            provider=data.provider,
            error=error_msg,
        )


@router.post("/providers")
async def get_providers_with_keys(data: ProvidersRequest):
    """
    Get available providers, accounting for user-provided API keys.
    A provider is 'available' if it has a key from either user settings or server .env.
    """
    api_keys = dict(data.api_keys) if data.api_keys else {}
    providers = AIProviderFactory.get_available_providers(api_keys=api_keys)
    return {
        "default_provider": settings.default_ai_provider,
        "providers": providers,
    }


class FetchModelsRequest(BaseModel):
    provider: str
    api_key: str | None = None
    local_url: str | None = None


# Hardcoded fallback models per provider (used when API fetch fails)
FALLBACK_MODELS: dict[str, list[str]] = {
    "anthropic": [
        "claude-sonnet-4-5-20250929",
        "claude-opus-4-6",
        "claude-haiku-4-5-20251001",
    ],
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
    ],
    "openrouter": [
        "anthropic/claude-sonnet-4-5",
        "anthropic/claude-opus-4-6",
        "openai/gpt-4o",
        "google/gemini-pro",
        "meta-llama/llama-3-70b-instruct",
    ],
    "gemini": [
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
    ],
    "kimi": [
        "moonshot-v1-8k",
        "moonshot-v1-32k",
        "moonshot-v1-128k",
    ],
    "local": [
        "llama3",
        "llama3.1",
        "mistral",
        "mixtral",
        "deepseek-r1",
        "qwen2.5",
    ],
}


async def _fetch_openai_compatible_models(
    base_url: str, api_key: str, headers: dict | None = None
) -> list[str]:
    """Fetch models from an OpenAI-compatible /v1/models endpoint."""
    h = {"Authorization": f"Bearer {api_key}"}
    if headers:
        h.update(headers)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{base_url}/models", headers=h)
        resp.raise_for_status()
        data = resp.json()
        return sorted([m["id"] for m in data.get("data", [])])


async def _fetch_anthropic_models(api_key: str) -> list[str]:
    """Fetch models from Anthropic's /v1/models endpoint."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://api.anthropic.com/v1/models",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return sorted([m["id"] for m in data.get("data", [])])


async def _fetch_gemini_models(api_key: str) -> list[str]:
    """Fetch models from Google's Generative AI API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        )
        resp.raise_for_status()
        data = resp.json()
        models = []
        for m in data.get("models", []):
            # API returns "models/gemini-pro" — strip the prefix
            name = m.get("name", "")
            if name.startswith("models/"):
                name = name[7:]
            # Only include generative models (not embedding models)
            methods = m.get("supportedGenerationMethods", [])
            if "generateContent" in methods:
                models.append(name)
        return sorted(models)


@router.post("/models")
async def fetch_models(data: FetchModelsRequest):
    """
    Fetch available models from a provider's API.
    Falls back to hardcoded defaults if the API call fails.
    """
    provider = data.provider

    # Resolve API key: user-provided > .env
    api_key = data.api_key
    if not api_key:
        attr = PROVIDER_KEY_MAP.get(provider, "")
        api_key = getattr(settings, attr, "") if attr else ""

    fallback = FALLBACK_MODELS.get(provider, [])

    if not api_key and provider != "local":
        return {"provider": provider, "models": fallback, "source": "fallback"}

    try:
        if provider == "anthropic":
            models = await _fetch_anthropic_models(api_key)
        elif provider == "openai":
            models = await _fetch_openai_compatible_models(
                "https://api.openai.com/v1", api_key
            )
            # Filter to chat models only
            models = [
                m for m in models
                if m.startswith(("gpt-", "o1", "o3", "o4", "chatgpt"))
                and "instruct" not in m
                and "audio" not in m
                and "realtime" not in m
                and "search" not in m
            ]
        elif provider == "openrouter":
            models = await _fetch_openai_compatible_models(
                "https://openrouter.ai/api/v1",
                api_key or "",
            )
        elif provider == "gemini":
            models = await _fetch_gemini_models(api_key)
        elif provider == "kimi":
            models = await _fetch_openai_compatible_models(
                "https://api.moonshot.cn/v1", api_key
            )
        elif provider == "local":
            url = data.local_url or getattr(settings, "local_url", "") or "http://localhost:11434/v1"
            # Strip trailing /v1 if present for the base, then add /v1/models
            base = url.rstrip("/")
            if not base.endswith("/v1"):
                base = base + "/v1"
            models = await _fetch_openai_compatible_models(
                base, api_key or "not-needed"
            )
        else:
            return {"provider": provider, "models": fallback, "source": "fallback"}

        if not models:
            return {"provider": provider, "models": fallback, "source": "fallback"}

        return {"provider": provider, "models": models, "source": "api"}

    except Exception as e:
        logger.info(f"Failed to fetch models for {provider}: {e}")
        return {"provider": provider, "models": fallback, "source": "fallback"}
