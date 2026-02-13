from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.agents.core.agent import OPTCGAgent

logger = logging.getLogger(__name__)


@dataclass
class ToolResponse:
    """Result returned by a tool execution."""

    message: str
    break_loop: bool = False  # True only for the "response" tool
    data: dict | None = None  # Structured data (charts, tables — Phase 2)


class BaseTool(ABC):
    """Base class for all agent tools."""

    def __init__(self, agent: OPTCGAgent, args: dict[str, Any]):
        self.agent = agent
        self.args = args

    @abstractmethod
    async def execute(self) -> ToolResponse:
        """Execute the tool and return a response."""
        ...

    @classmethod
    def name(cls) -> str:
        """Tool name used by the LLM for function calling."""
        raise NotImplementedError

    @classmethod
    def description(cls) -> str:
        """Human-readable description for the system prompt."""
        raise NotImplementedError

    @classmethod
    def parameters(cls) -> dict:
        """JSON Schema for the tool's arguments."""
        raise NotImplementedError

    @classmethod
    def schema(cls) -> dict:
        """Full tool schema for LLM function calling."""
        return {
            "name": cls.name(),
            "description": cls.description(),
            "parameters": cls.parameters(),
        }


# ── Tool Registry ──

_TOOL_REGISTRY: dict[str, type[BaseTool]] = {}


def register_tool(cls: type[BaseTool]) -> type[BaseTool]:
    """Decorator to register a tool class."""
    _TOOL_REGISTRY[cls.name()] = cls
    return cls


def get_tool_class(name: str) -> type[BaseTool] | None:
    return _TOOL_REGISTRY.get(name)


def get_all_tools() -> dict[str, type[BaseTool]]:
    return dict(_TOOL_REGISTRY)
