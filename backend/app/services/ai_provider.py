from typing import Literal
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOpenAI as ChatOpenRouter
from app.config import settings
import logging

logger = logging.getLogger(__name__)

AIProvider = Literal["anthropic", "openai", "openrouter", "gemini", "kimi", "local"]

# Maps provider id -> env setting attribute name
PROVIDER_KEY_MAP = {
    "anthropic": "anthropic_api_key",
    "openai": "openai_api_key",
    "openrouter": "openrouter_api_key",
    "gemini": "google_api_key",
    "kimi": "kimi_api_key",
    "local": "local_api_key",
}


class AIProviderFactory:
    """Factory for creating LLM instances from different providers"""

    @staticmethod
    def _resolve_key(provider: str, api_keys: dict[str, str] | None = None) -> str:
        """Resolve API key: user-provided keys take priority over .env."""
        # Check user-provided keys first
        if api_keys and api_keys.get(provider):
            return api_keys[provider]

        # Local provider key is optional (many local servers don't need one)
        if provider == "local":
            attr = PROVIDER_KEY_MAP.get(provider, "")
            return getattr(settings, attr, "") or "not-needed"

        # Fall back to .env
        attr = PROVIDER_KEY_MAP.get(provider, "")
        env_key = getattr(settings, attr, "") if attr else ""
        if not env_key:
            raise ValueError(
                f"No API key configured for {provider}. "
                "Please add your key in Settings."
            )
        return env_key

    @staticmethod
    def get_llm(
        provider: AIProvider = "anthropic",
        temperature: float = 0.7,
        model: str | None = None,
        api_keys: dict[str, str] | None = None,
        local_url: str | None = None,
    ):
        """
        Get an LLM instance from the specified provider.

        Args:
            provider: AI provider name
            temperature: Temperature for generation (0-1)
            model: Specific model name (optional, uses defaults if not provided)
            api_keys: Optional dict of {provider_id: api_key} from user settings.
                      These override .env keys.
            local_url: Base URL for local AI server (only used when provider="local").
        """
        logger.info(f"Creating LLM instance for provider: {provider}")

        try:
            key = AIProviderFactory._resolve_key(provider, api_keys)

            if provider == "anthropic":
                return AIProviderFactory._get_anthropic(temperature, model, key)
            elif provider == "openai":
                return AIProviderFactory._get_openai(temperature, model, key)
            elif provider == "openrouter":
                return AIProviderFactory._get_openrouter(temperature, model, key)
            elif provider == "gemini":
                return AIProviderFactory._get_gemini(temperature, model, key)
            elif provider == "kimi":
                return AIProviderFactory._get_kimi(temperature, model, key)
            elif provider == "local":
                return AIProviderFactory._get_local(temperature, model, key, local_url)
            else:
                raise ValueError(f"Unknown AI provider: {provider}")

        except Exception as e:
            logger.error(f"Error creating LLM for provider {provider}: {e}")
            raise

    @staticmethod
    def _get_anthropic(temperature: float, model: str | None, api_key: str):
        model_name = model or "claude-sonnet-4-5-20250929"
        return ChatAnthropic(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=4096,
        )

    @staticmethod
    def _get_openai(temperature: float, model: str | None, api_key: str):
        model_name = model or "gpt-4-turbo-preview"
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            max_tokens=4096,
        )

    @staticmethod
    def _get_openrouter(temperature: float, model: str | None, api_key: str):
        model_name = model or "anthropic/claude-sonnet-4-5"
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=temperature,
            max_tokens=4096,
            default_headers={
                "HTTP-Referer": "https://optcg-ai-agent.app",
                "X-Title": "OPTCG AI Agent",
            },
        )

    @staticmethod
    def _get_gemini(temperature: float, model: str | None, api_key: str):
        model_name = model or "gemini-pro"
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=temperature,
            max_output_tokens=4096,
        )

    @staticmethod
    def _get_kimi(temperature: float, model: str | None, api_key: str):
        model_name = model or "moonshot-v1-8k"
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://api.moonshot.cn/v1",
            temperature=temperature,
            max_tokens=4096,
        )

    @staticmethod
    def _get_local(
        temperature: float, model: str | None, api_key: str, base_url: str | None
    ):
        """Get a local LLM via OpenAI-compatible API (Ollama, LM Studio, vLLM, etc.)."""
        url = base_url or getattr(settings, "local_url", "") or "http://localhost:11434/v1"
        # Normalize: ensure URL ends with /v1 for OpenAI-compatible endpoints
        url = url.rstrip("/")
        if not url.endswith("/v1"):
            url = url + "/v1"
        if not model:
            raise ValueError(
                "No model specified for local provider. "
                "Please set a model name in Settings → Local AI."
            )
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=url,
            temperature=temperature,
        )

    @staticmethod
    def get_available_providers(
        api_keys: dict[str, str] | None = None,
        local_url: str | None = None,
    ) -> list[dict]:
        """Get list of providers with their availability status.

        A provider is 'available' if it has an API key either from
        user settings (api_keys) or from the server .env.
        """
        def _has_key(provider_id: str) -> bool:
            if api_keys and api_keys.get(provider_id):
                return True
            attr = PROVIDER_KEY_MAP.get(provider_id, "")
            return bool(getattr(settings, attr, "")) if attr else False

        providers = [
            {
                "id": "anthropic",
                "name": "Claude (Anthropic)",
                "available": _has_key("anthropic"),
                "default_model": "claude-sonnet-4-5-20250929",
                "models": [
                    "claude-sonnet-4-5-20250929",
                    "claude-opus-4-6",
                    "claude-haiku-4-5-20251001",
                ],
            },
            {
                "id": "openai",
                "name": "OpenAI",
                "available": _has_key("openai"),
                "default_model": "gpt-4-turbo-preview",
                "models": [
                    "gpt-4-turbo-preview",
                    "gpt-4",
                    "gpt-3.5-turbo",
                ],
            },
            {
                "id": "openrouter",
                "name": "OpenRouter",
                "available": _has_key("openrouter"),
                "default_model": "anthropic/claude-sonnet-4-5",
                "models": [
                    "anthropic/claude-sonnet-4-5",
                    "anthropic/claude-opus-4-6",
                    "openai/gpt-4-turbo",
                    "google/gemini-pro",
                    "meta-llama/llama-3-70b-instruct",
                ],
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "available": _has_key("gemini"),
                "default_model": "gemini-pro",
                "models": [
                    "gemini-pro",
                    "gemini-pro-vision",
                ],
            },
            {
                "id": "kimi",
                "name": "Kimi (Moonshot AI)",
                "available": _has_key("kimi"),
                "default_model": "moonshot-v1-8k",
                "models": [
                    "moonshot-v1-8k",
                    "moonshot-v1-32k",
                    "moonshot-v1-128k",
                ],
            },
        ]

        return providers

    @staticmethod
    def get_provider_info(provider: AIProvider) -> dict:
        """Get information about a specific provider"""
        all_providers = AIProviderFactory.get_available_providers()
        for p in all_providers:
            if p["id"] == provider:
                return p
        raise ValueError(f"Unknown provider: {provider}")
