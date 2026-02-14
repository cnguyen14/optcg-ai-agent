"""CardManager — executes deck modifications (no LLM, pure execution)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.services.search_service import SearchService

logger = logging.getLogger(__name__)


@dataclass
class DeckAction:
    """A single deck action with its action_data payload for the frontend."""

    action: str  # "set_leader", "add_cards", "remove_cards"
    data: dict = field(default_factory=dict)


@dataclass
class DeckModificationResult:
    """Result of one or more deck modifications."""

    actions: list[DeckAction] = field(default_factory=list)
    summary: str = ""
    errors: list[str] = field(default_factory=list)

    @property
    def action_data(self) -> dict | None:
        """Combine actions into a single action_data payload for the frontend."""
        payloads = [a.data for a in self.actions if a.data]
        if not payloads:
            return None
        if len(payloads) == 1:
            return payloads[0]
        return {"action": "batch_deck_update", "actions": payloads}


class CardManager:
    """Executes structured deck modifications. No LLM — deterministic and instant."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.search = SearchService(db)

    async def set_leader(self, leader_id: str) -> DeckModificationResult:
        """Set the deck leader. Validates the leader exists."""
        leader = await self.search.get_leader_by_id(leader_id)

        if not leader:
            return DeckModificationResult(
                errors=[f"Leader '{leader_id}' not found in the database."]
            )

        action_data = {"action": "set_leader", "leader": leader}
        summary = (
            f"Leader set to {leader['name']} ({leader['id']}) — "
            f"Colors: {', '.join(leader.get('colors', []))} | "
            f"Life: {leader.get('life')} | Power: {leader.get('power')}"
        )

        return DeckModificationResult(
            actions=[DeckAction(action="set_leader", data=action_data)],
            summary=summary,
        )

    async def add_cards(
        self,
        cards: list[dict],
        leader_colors: list[str] | None = None,
    ) -> DeckModificationResult:
        """
        Add cards to the deck.

        Args:
            cards: List of {card_id, quantity} dicts.
            leader_colors: Leader's colors for color identity validation.
        """
        if not cards:
            return DeckModificationResult(errors=["No cards specified."])

        card_ids = [c["card_id"] for c in cards]
        quantity_map = {
            c["card_id"]: min(max(int(c.get("quantity", 1)), 1), 4) for c in cards
        }

        # Fetch cards from DB
        found_cards = await self.search.get_cards_by_ids(card_ids)

        # Validate existence
        missing = [cid for cid in card_ids if cid not in found_cards]
        if missing:
            return DeckModificationResult(
                errors=[f"Cards not found: {', '.join(missing)}. Use search_cards to find valid card IDs."]
            )

        # Validate color identity
        if leader_colors:
            leader_color_set = {c.strip() for c in leader_colors}
            violations = []
            for cid, card in found_cards.items():
                if card.get("color"):
                    card_colors = {c.strip() for c in card["color"].split(",")}
                    if not card_colors.issubset(leader_color_set):
                        violations.append(
                            f"{card['name']} ({card['id']}) is {card['color']} — "
                            f"not in leader colors {leader_colors}"
                        )
            if violations:
                return DeckModificationResult(
                    errors=[
                        "Color identity violations:\n" + "\n".join(violations) +
                        "\nThese cards don't match the leader's color identity."
                    ]
                )

        # Build result
        cards_data = []
        added_lines = []
        for cid in card_ids:
            card = found_cards[cid]
            qty = quantity_map[cid]
            cards_data.append({"card": card, "quantity": qty})
            added_lines.append(
                f"  {qty}x {card['name']} ({card['id']}) — "
                f"{card.get('type', '?')}, Cost {card.get('cost', '?')}"
            )

        total_added = sum(quantity_map[cid] for cid in card_ids)
        action_data = {"action": "add_cards", "cards": cards_data}
        summary = f"Added {total_added} card(s) to deck:\n" + "\n".join(added_lines)

        return DeckModificationResult(
            actions=[DeckAction(action="add_cards", data=action_data)],
            summary=summary,
        )

    async def remove_cards(self, card_ids: list[str]) -> DeckModificationResult:
        """Remove cards from the deck by ID."""
        if not card_ids:
            return DeckModificationResult(errors=["No card IDs specified."])

        action_data = {"action": "remove_cards", "card_ids": card_ids}
        summary = f"Removed {len(card_ids)} card(s) from deck: {', '.join(card_ids)}"

        return DeckModificationResult(
            actions=[DeckAction(action="remove_cards", data=action_data)],
            summary=summary,
        )

    async def execute_plan(self, plan) -> DeckModificationResult:
        """
        Execute a StrategyPlan — batch set leader + add cards + remove cards.

        Args:
            plan: A StrategyPlan dataclass with leader_to_set, cards_to_add, cards_to_remove.
        """
        all_actions: list[DeckAction] = []
        summaries: list[str] = []
        errors: list[str] = []

        # Set leader
        if plan.leader_to_set:
            result = await self.set_leader(plan.leader_to_set)
            all_actions.extend(result.actions)
            if result.summary:
                summaries.append(result.summary)
            errors.extend(result.errors)

        # Remove cards first (before adding, to free up slots)
        if plan.cards_to_remove:
            result = await self.remove_cards(plan.cards_to_remove)
            all_actions.extend(result.actions)
            if result.summary:
                summaries.append(result.summary)
            errors.extend(result.errors)

        # Add cards
        if plan.cards_to_add:
            # Extract leader_colors from context if available
            leader_colors = plan.leader_colors if hasattr(plan, "leader_colors") else None
            result = await self.add_cards(plan.cards_to_add, leader_colors)
            all_actions.extend(result.actions)
            if result.summary:
                summaries.append(result.summary)
            errors.extend(result.errors)

        return DeckModificationResult(
            actions=all_actions,
            summary="\n".join(summaries),
            errors=errors,
        )
