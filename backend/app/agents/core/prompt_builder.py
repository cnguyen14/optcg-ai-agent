import logging
from pathlib import Path
from app.agents.core.tool import get_all_tools

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_template(filename: str) -> str:
    """Load a markdown prompt template."""
    path = PROMPTS_DIR / filename
    if not path.exists():
        logger.warning(f"Prompt template not found: {path}")
        return ""
    return path.read_text(encoding="utf-8")


def build_tool_descriptions() -> str:
    """Build tool descriptions block from the registry."""
    tools = get_all_tools()
    if not tools:
        return "No tools available."

    lines = []
    for tool_cls in tools.values():
        schema = tool_cls.schema()
        params = schema.get("parameters", {}).get("properties", {})
        required = schema.get("parameters", {}).get("required", [])

        param_lines = []
        for pname, pinfo in params.items():
            req = " (required)" if pname in required else ""
            param_lines.append(f"    - {pname}: {pinfo.get('description', pinfo.get('type', ''))}{req}")

        lines.append(f"**{schema['name']}** — {schema['description']}")
        if param_lines:
            lines.append("  Parameters:")
            lines.extend(param_lines)
        lines.append("")

    return "\n".join(lines)


def build_system_prompt(
    context: dict | None = None,
    memories: list[dict] | None = None,
) -> str:
    """Assemble the full system prompt from templates + dynamic data."""
    role = _load_template("system_role.md")
    rules = _load_template("system_rules.md")
    communication = _load_template("system_communication.md")
    tips = _load_template("system_tips.md")

    # Build tool descriptions
    tool_desc = build_tool_descriptions()

    # Build memories block
    memories_block = ""
    if memories:
        chunks = []
        for m in memories[:5]:
            chunks.append(f"- [{m.get('source', 'unknown')}] {m.get('text', '')[:300]}")
        memories_block = "## Recalled Knowledge\n" + "\n".join(chunks)

    # Build context block
    context_block = ""
    if context:
        parts = []
        if context.get("deck_id"):
            parts.append(f"- Active deck ID: {context['deck_id']}")
        if context.get("page"):
            parts.append(f"- User is on page: {context['page']}")
        if parts:
            context_block = "## Current Context\n" + "\n".join(parts)

    # Assemble
    sections = [
        role,
        rules,
        f"## Available Tools\n\n{tool_desc}",
        communication,
        tips,
    ]
    if context_block:
        sections.append(context_block)
    if memories_block:
        sections.append(memories_block)

    return "\n\n---\n\n".join(s for s in sections if s.strip())
