from typing import List, Tuple
from app.models.deck import Deck
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class DeckValidator:
    """Validates One Piece TCG deck construction rules"""

    async def validate_deck(
        self, deck: Deck, db: AsyncSession
    ) -> Tuple[bool, List[str]]:
        """
        Validate deck against One Piece TCG rules

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Rule 1: Must have exactly 1 leader
        if not deck.leader_id:
            errors.append("Deck must have a leader")

        # Rule 2: Must have exactly 50 cards
        total_cards = sum(dc.quantity for dc in deck.deck_cards)
        if total_cards != 50:
            errors.append(f"Deck must have exactly 50 cards (currently has {total_cards})")

        # Rule 3: Max 4 copies of any card (except DON!! cards)
        for deck_card in deck.deck_cards:
            if deck_card.quantity > 4:
                errors.append(
                    f"Max 4 copies allowed of '{deck_card.card.name}' (has {deck_card.quantity})"
                )

        # Rule 4: Color identity must match leader
        if deck.leader:
            allowed_colors = set(deck.leader.colors)

            for deck_card in deck.deck_cards:
                card_colors = self._parse_color(deck_card.card.color)
                if not card_colors.issubset(allowed_colors):
                    errors.append(
                        f"'{deck_card.card.name}' has invalid color(s) for this leader. "
                        f"Leader allows: {', '.join(allowed_colors)}, "
                        f"Card has: {', '.join(card_colors)}"
                    )

        return len(errors) == 0, errors

    def _parse_color(self, color_str: str | None) -> set:
        """Parse color string into set of colors.

        Handles both comma-separated (legacy) and space-separated (optcgapi) formats.
        """
        if not color_str:
            return set()

        # Handle comma-separated (e.g., "Red,Blue")
        if "," in color_str:
            return set(c.strip() for c in color_str.split(","))

        # Handle space-separated multi-color (e.g., "Green Red")
        valid_colors = {"Red", "Green", "Blue", "Purple", "Black", "Yellow"}
        tokens = color_str.strip().split()
        colors = {t for t in tokens if t in valid_colors}
        if colors:
            return colors

        return {color_str.strip()}

    def calculate_deck_stats(self, deck: Deck) -> dict:
        """Calculate deck statistics"""
        total_cards = 0
        total_cost = 0
        color_counts = {}
        cost_curve = {}

        for deck_card in deck.deck_cards:
            card = deck_card.card
            quantity = deck_card.quantity

            total_cards += quantity

            # Calculate average cost
            if card.cost is not None:
                total_cost += card.cost * quantity

            # Color distribution
            colors = self._parse_color(card.color)
            for color in colors:
                color_counts[color] = color_counts.get(color, 0) + quantity

            # Cost curve
            cost = card.cost if card.cost is not None else 0
            cost_curve[cost] = cost_curve.get(cost, 0) + quantity

        avg_cost = round(total_cost / total_cards, 2) if total_cards > 0 else 0

        return {
            "total_cards": total_cards,
            "avg_cost": avg_cost,
            "color_distribution": color_counts,
            "cost_curve": cost_curve,
        }
