import logging
from pathlib import Path
from app.agents.core.tool import get_all_tools, get_tools_by_names

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_template(filename: str) -> str:
    """Load a markdown prompt template."""
    path = PROMPTS_DIR / filename
    if not path.exists():
        logger.warning(f"Prompt template not found: {path}")
        return ""
    return path.read_text(encoding="utf-8")


def _build_context_block(context: dict | None) -> str:
    """Build the context block from the agent context dict."""
    if not context:
        return ""

    parts = []
    if context.get("deck_id"):
        parts.append(f"- Active deck ID: {context['deck_id']}")
    if context.get("page"):
        parts.append(f"- User is on page: {context['page']}")

    # Include deck builder state if available
    dbs = context.get("deck_builder_state")
    if dbs:
        leader = dbs.get("leader")
        total = dbs.get("total_cards", 0)
        cards = dbs.get("cards", [])

        parts.append("")
        parts.append("### Deck Builder State")
        if leader:
            parts.append(f"- Leader: {leader.get('name', '?')} ({leader.get('id', '?')}) — Colors: {', '.join(leader.get('colors', []))}")
        else:
            parts.append("- Leader: Not set")
        parts.append(f"- Total cards: {total}/50")

        if cards:
            card_lines = []
            for c in cards[:25]:
                card_lines.append(f"  - {c.get('quantity', 1)}x {c.get('name', '?')} ({c.get('id', '?')}) [{c.get('type', '?')}, Cost {c.get('cost', '?')}, {c.get('color', '?')}]")
            parts.append("- Cards in deck:")
            parts.extend(card_lines)
            if len(cards) > 25:
                parts.append(f"  - ... and {len(cards) - 25} more cards")

    if parts:
        return "## Current Context\n" + "\n".join(parts)
    return ""


def build_tool_descriptions(tool_names: list[str] | None = None) -> str:
    """Build tool descriptions block from the registry.

    If tool_names is provided, only describe those tools.
    """
    if tool_names:
        tools = get_tools_by_names(tool_names)
    else:
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
    tool_names: list[str] | None = None,
) -> str:
    """Assemble the full system prompt from templates + dynamic data."""
    role = _load_template("system_role.md")
    rules = _load_template("system_rules.md")
    communication = _load_template("system_communication.md")
    tips = _load_template("system_tips.md")
    orchestrator = _load_template("system_orchestrator.md")

    # Build tool descriptions
    tool_desc = build_tool_descriptions(tool_names=tool_names)

    # Build memories block
    memories_block = ""
    if memories:
        chunks = []
        for m in memories[:5]:
            chunks.append(f"- [{m.get('source', 'unknown')}] {m.get('text', '')[:300]}")
        memories_block = "## Recalled Knowledge\n" + "\n".join(chunks)

    # Build context block
    context_block = _build_context_block(context)

    # Conditionally load deck building prompt
    deck_building = ""
    if context and (context.get("page") == "deck-builder" or context.get("deck_id")):
        deck_building = _load_template("system_deck_building.md")

    # Assemble
    sections = [
        role,
        rules,
        f"## Available Tools\n\n{tool_desc}",
        communication,
        tips,
        orchestrator,
    ]
    if deck_building:
        sections.append(deck_building)
    if context_block:
        sections.append(context_block)
    if memories_block:
        sections.append(memories_block)

    return "\n\n---\n\n".join(s for s in sections if s.strip())


def build_strategy_agent_prompt(context: dict | None = None) -> str:
    """Build the system prompt for the strategy agent."""
    strategy_prompt = _load_template("strategy_agent.md")
    rules = _load_template("system_rules.md")
    context_block = _build_context_block(context)

    sections = [strategy_prompt, rules]
    if context_block:
        sections.append(context_block)

    return "\n\n---\n\n".join(s for s in sections if s.strip())
