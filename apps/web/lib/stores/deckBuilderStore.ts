import { create } from "zustand";
import { Card, Leader, DeckCard, Deck } from "@/types";

interface DeckBuilderState {
  deckId: string | null;
  leader: Leader | null;
  cards: DeckCard[];
  deckName: string;
  deckDescription: string;

  // Actions
  setDeckId: (id: string | null) => void;
  setLeader: (leader: Leader | null) => void;
  addCard: (card: Card, quantity?: number) => void;
  removeCard: (cardId: string) => void;
  updateQuantity: (cardId: string, quantity: number) => void;
  setDeckName: (name: string) => void;
  setDeckDescription: (description: string) => void;
  clearDeck: () => void;
  loadDeck: (deck: Deck) => void;

  // Computed values
  getTotalCards: () => number;
  getCostCurve: () => Record<number, number>;
  getColorDistribution: () => Record<string, number>;
}

export const useDeckBuilder = create<DeckBuilderState>((set, get) => ({
  deckId: null,
  leader: null,
  cards: [],
  deckName: "New Deck",
  deckDescription: "",

  setDeckId: (id) => set({ deckId: id }),

  setLeader: (leader) => set({ leader }),

  addCard: (card, quantity = 1) =>
    set((state) => {
      const existing = state.cards.find((c) => c.card.id === card.id);

      if (existing) {
        // Update quantity (max 4)
        return {
          cards: state.cards.map((c) =>
            c.card.id === card.id
              ? { ...c, quantity: Math.min(c.quantity + quantity, 4) }
              : c
          ),
        };
      }

      // Add new card
      return {
        cards: [
          ...state.cards,
          {
            id: `temp-${Date.now()}`,
            card,
            quantity: Math.min(quantity, 4),
          },
        ],
      };
    }),

  removeCard: (cardId) =>
    set((state) => ({
      cards: state.cards.filter((c) => c.card.id !== cardId),
    })),

  updateQuantity: (cardId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { cards: state.cards.filter((c) => c.card.id !== cardId) };
      }

      return {
        cards: state.cards.map((c) =>
          c.card.id === cardId ? { ...c, quantity: Math.min(quantity, 4) } : c
        ),
      };
    }),

  setDeckName: (name) => set({ deckName: name }),

  setDeckDescription: (description) => set({ deckDescription: description }),

  clearDeck: () =>
    set({
      deckId: null,
      leader: null,
      cards: [],
      deckName: "New Deck",
      deckDescription: "",
    }),

  loadDeck: (deck: Deck) =>
    set({
      deckId: deck.id,
      leader: deck.leader || null,
      cards: deck.deck_cards,
      deckName: deck.name,
      deckDescription: deck.description || "",
    }),

  getTotalCards: () => {
    const { cards } = get();
    return cards.reduce((sum, c) => sum + c.quantity, 0);
  },

  getCostCurve: () => {
    const { cards } = get();
    const curve: Record<number, number> = {};

    cards.forEach(({ card, quantity }) => {
      const cost = card.cost ?? 0;
      curve[cost] = (curve[cost] || 0) + quantity;
    });

    return curve;
  },

  getColorDistribution: () => {
    const { cards } = get();
    const distribution: Record<string, number> = {};

    cards.forEach(({ card, quantity }) => {
      if (card.color) {
        const colors = card.color.split(",").map((c) => c.trim());
        colors.forEach((color) => {
          distribution[color] = (distribution[color] || 0) + quantity;
        });
      }
    });

    return distribution;
  },
}));
