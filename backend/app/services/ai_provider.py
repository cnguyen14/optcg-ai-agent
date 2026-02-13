from typing import Literal
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOpenAI as ChatOpenRouter
from app.config import settings
import logging

logger = logging.getLogger(__name__)

AIProvider = Literal["anthropic", "openai", "openrouter", "gemini", "kimi"]


class AIProviderFactory:
    """Factory for creating LLM instances from different providers"""

    @staticmethod
    def get_llm(
        provider: AIProvider = "anthropic",
        temperature: float = 0.7,
        model: str | None = None,
    ):
        """
        Get an LLM instance from the specified provider

        Args:
            provider: AI provider name
            temperature: Temperature for generation (0-1)
            model: Specific model name (optional, uses defaults if not provided)

        Returns:
            LLM instance compatible with LangChain
        """
        logger.info(f"Creating LLM instance for provider: {provider}")

        try:
            if provider == "anthropic":
                return AIProviderFactory._get_anthropic(temperature, model)
            elif provider == "openai":
                return AIProviderFactory._get_openai(temperature, model)
            elif provider == "openrouter":
                return AIProviderFactory._get_openrouter(temperature, model)
            elif provider == "gemini":
                return AIProviderFactory._get_gemini(temperature, model)
            elif provider == "kimi":
                return AIProviderFactory._get_kimi(temperature, model)
            else:
                raise ValueError(f"Unknown AI provider: {provider}")

        except Exception as e:
            logger.error(f"Error creating LLM for provider {provider}: {e}")
            raise

    @staticmethod
    def _get_anthropic(temperature: float, model: str | None):
        """Get Claude (Anthropic) LLM"""
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        model_name = model or "claude-sonnet-4-5-20250929"

        return ChatAnthropic(
            model=model_name,
            api_key=settings.anthropic_api_key,
            temperature=temperature,
            max_tokens=4096,
        )

    @staticmethod
    def _get_openai(temperature: float, model: str | None):
        """Get OpenAI LLM"""
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY not configured")

        model_name = model or "gpt-4-turbo-preview"

        return ChatOpenAI(
            model=model_name,
            api_key=settings.openai_api_key,
            temperature=temperature,
            max_tokens=4096,
        )

    @staticmethod
    def _get_openrouter(temperature: float, model: str | None):
        """Get OpenRouter LLM"""
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        # OpenRouter supports many models
        # Default to Claude via OpenRouter for consistency
        model_name = model or "anthropic/claude-sonnet-4-5"

        return ChatOpenAI(
            model=model_name,
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=temperature,
            max_tokens=4096,
            default_headers={
                "HTTP-Referer": "https://optcg-ai-agent.app",
                "X-Title": "OPTCG AI Agent",
            },
        )

    @staticmethod
    def _get_gemini(temperature: float, model: str | None):
        """Get Google Gemini LLM"""
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY not configured")

        model_name = model or "gemini-pro"

        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.google_api_key,
            temperature=temperature,
            max_output_tokens=4096,
        )

    @staticmethod
    def _get_kimi(temperature: float, model: str | None):
        """Get Kimi (Moonshot AI) LLM"""
        if not settings.kimi_api_key:
            raise ValueError("KIMI_API_KEY not configured")

        # Kimi uses OpenAI-compatible API
        model_name = model or "moonshot-v1-8k"

        return ChatOpenAI(
            model=model_name,
            api_key=settings.kimi_api_key,
            base_url="https://api.moonshot.cn/v1",
            temperature=temperature,
            max_tokens=4096,
        )

    @staticmethod
    def get_available_providers() -> list[dict]:
        """Get list of available providers with their configuration status"""
        providers = [
            {
                "id": "anthropic",
                "name": "Claude (Anthropic)",
                "available": bool(settings.anthropic_api_key),
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
                "available": bool(settings.openai_api_key),
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
                "available": bool(settings.openrouter_api_key),
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
                "available": bool(settings.google_api_key),
                "default_model": "gemini-pro",
                "models": [
                    "gemini-pro",
                    "gemini-pro-vision",
                ],
            },
            {
                "id": "kimi",
                "name": "Kimi (Moonshot AI)",
                "available": bool(settings.kimi_api_key),
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
