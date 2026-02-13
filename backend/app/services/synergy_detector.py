from typing import List, Dict
from app.models import Card


class SynergyDetector:
    """Detects synergies between cards in a deck"""

    async def detect_synergies(self, deck_cards: List[tuple[Card, int]]) -> List[Dict]:
        """
        Detect synergies in deck

        Args:
            deck_cards: List of (card, quantity) tuples

        Returns:
            List of synergy dictionaries
        """
        synergies = []

        for i, (card_a, qty_a) in enumerate(deck_cards):
            for card_b, qty_b in deck_cards[i + 1 :]:
                synergy = self._check_synergy(card_a, card_b)
                if synergy:
                    synergy["strength"] = min(qty_a, qty_b)  # Synergy strength
                    synergies.append(synergy)

        return synergies

    def _check_synergy(self, card_a: Card, card_b: Card) -> Dict | None:
        """Check if two cards have synergy"""

        # Attribute synergy (e.g., "Slash" attribute boost)
        if card_a.attribute and card_b.attribute == card_a.attribute:
            if card_a.attribute in (card_a.text or "") or card_a.attribute in (
                card_b.text or ""
            ):
                return {
                    "type": "attribute_synergy",
                    "cards": [card_a.id, card_b.id],
                    "card_names": [card_a.name, card_b.name],
                    "explanation": f"{card_a.attribute} attribute tribal synergy",
                    "attribute": card_a.attribute,
                }

        # Category synergy (e.g., "Straw Hat Crew")
        if card_a.category and card_a.category == card_b.category:
            return {
                "type": "category_synergy",
                "cards": [card_a.id, card_b.id],
                "card_names": [card_a.name, card_b.name],
                "explanation": f"{card_a.category} tribal synergy",
                "category": card_a.category,
            }

        # Cost curve synergy (smooth progression)
        if card_a.cost is not None and card_b.cost is not None:
            if abs(card_a.cost - card_b.cost) == 1:
                return {
                    "type": "curve_synergy",
                    "cards": [card_a.id, card_b.id],
                    "card_names": [card_a.name, card_b.name],
                    "explanation": f"Smooth cost progression ({card_a.cost} -> {card_b.cost})",
                }

        # Search effect synergy
        if card_a.text and card_b.text:
            card_a_text_lower = card_a.text.lower()
            card_b_text_lower = card_b.text.lower()

            # Card A searches for something, Card B benefits from being searched
            if "search" in card_a_text_lower and card_b.name.lower() in card_a_text_lower:
                return {
                    "type": "search_synergy",
                    "cards": [card_a.id, card_b.id],
                    "card_names": [card_a.name, card_b.name],
                    "explanation": f"{card_a.name} can search for {card_b.name}",
                }

        return None

    def get_synergy_summary(self, synergies: List[Dict]) -> Dict:
        """Generate a summary of synergies"""
        summary = {
            "total_synergies": len(synergies),
            "by_type": {},
            "strongest": [],
        }

        # Group by type
        for synergy in synergies:
            synergy_type = synergy["type"]
            summary["by_type"][synergy_type] = (
                summary["by_type"].get(synergy_type, 0) + 1
            )

        # Find strongest synergies (by strength)
        sorted_synergies = sorted(
            synergies, key=lambda x: x.get("strength", 0), reverse=True
        )
        summary["strongest"] = sorted_synergies[:5]

        return summary
