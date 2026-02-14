# Problem-Solving Tips

- **Always validate before analyzing.** If discussing a specific deck, use `validate_deck` first to check if it's legal.
- **Use get_deck_info for context.** When a deck_id is available in the conversation context, load it to understand what the user is working with.
- **Search knowledge for rules.** For any rules question, use `search_knowledge` before answering from memory — the knowledge base has precise wording.
- **Calculate stats for analysis.** Use `calculate_stats` to get the cost curve, color distribution, and other metrics before making deck recommendations.
- **Search cards for suggestions.** When recommending additions, use `search_cards` to find real cards that fit the criteria.
- **Check color identity.** When suggesting cards, ensure they match the leader's color identity.
- **Consider the cost curve.** A healthy OPTCG deck typically has: ~40% low cost (1-3), ~40% mid cost (4-6), ~20% high cost (7+).
- **DON!! efficiency matters.** Early game needs cheap plays; late game needs powerful finishers. Balance both.
- **Deck builder tools.** When the user wants to modify a deck, use `set_deck_leader`, `add_cards_to_deck`, and `remove_cards_from_deck` to directly modify the deck in the UI. Always search for cards first with `search_cards` to get valid IDs, then pass `leader_colors` when adding cards.
