"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useDeckBuilder } from "@/lib/stores/deckBuilderStore";
import { useChatStore } from "@/lib/stores/chatStore";
import { api } from "@/lib/api/client";
import { Card, Leader } from "@/types";
import CardTooltip from "@/components/ui/CardTooltip";
import CardDetailModal from "@/components/ui/CardDetailModal";

const COLOR_MAP: Record<string, string> = {
  Red: "#DC2626",
  Blue: "#2563EB",
  Green: "#16A34A",
  Purple: "#9333EA",
  Black: "#374151",
  Yellow: "#EAB308",
};

export default function DeckBuilderPage() {
  const searchParams = useSearchParams();
  const deckIdParam = searchParams.get("deckId");
  const { loadDeck, clearDeck, deckId } = useDeckBuilder();
  const setContext = useChatStore((s) => s.setContext);

  // Clear store when navigating to /deck-builder without a deckId (new deck)
  useEffect(() => {
    if (!deckIdParam && deckId) {
      clearDeck();
    }
  }, [deckIdParam, deckId, clearDeck]);

  // Sync deck ID to chat context
  useEffect(() => {
    setContext(deckId || null, "deck-builder");
  }, [deckId, setContext]);

  // Clear context on unmount
  useEffect(() => {
    return () => {
      useChatStore.getState().setContext(null, null);
    };
  }, []);

  const { data: existingDeck } = useQuery({
    queryKey: ["deck", deckIdParam],
    queryFn: () => api.getDeck(deckIdParam!),
    enabled: !!deckIdParam && deckIdParam !== deckId,
  });

  useEffect(() => {
    if (existingDeck && existingDeck.id !== deckId) {
      loadDeck(existingDeck);
    }
  }, [existingDeck, deckId, loadDeck]);

  return (
    <div className="h-[calc(100vh-5rem-2rem)] mt-8 flex flex-col">
      <DeckToolbar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[55%] border-r border-white/10 overflow-y-auto">
          <CardSearchPanel />
        </div>
        <div className="w-[45%] overflow-y-auto">
          <DeckPanel />
        </div>
      </div>
    </div>
  );
}

function DeckToolbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    deckName,
    setDeckName,
    getTotalCards,
    clearDeck,
    cards,
    leader,
    deckId,
    setDeckId,
  } = useDeckBuilder();

  const totalCards = getTotalCards();
  const pct = Math.min((totalCards / 50) * 100, 100);
  const barColor =
    totalCards === 50
      ? "bg-emerald-500"
      : totalCards > 50
        ? "bg-red-500"
        : "bg-sky-500";

  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = leader && totalCards > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const state = useDeckBuilder.getState();
      const cardPayload = cards.map((dc) => ({
        card_id: dc.card.id,
        quantity: dc.quantity,
      }));

      if (deckId) {
        await api.updateDeck(deckId, {
          name: state.deckName,
          description: state.deckDescription,
          leader_id: leader!.id,
          cards: cardPayload,
        });
      } else {
        const deck = await api.createDeck({
          name: state.deckName,
          description: state.deckDescription,
          leader_id: leader!.id,
          is_public: false,
          cards: cardPayload,
        });
        setDeckId(deck.id);
      }
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      router.push("/decks");
    } catch (error) {
      alert(`Error saving deck: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-heavy px-4 py-2 flex items-center gap-3 shrink-0 rounded-none">
      <input
        type="text"
        value={deckName}
        onChange={(e) => setDeckName(e.target.value)}
        className="px-3 py-1.5 glass-input font-semibold text-sm w-48"
      />

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2 max-w-xs">
        <div className="flex-1 h-3 glass-progress-bar">
          <div
            className={`h-full glass-progress-fill ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`text-xs font-mono font-semibold whitespace-nowrap ${
            totalCards === 50
              ? "text-emerald-400"
              : totalCards > 50
                ? "text-red-400"
                : "text-white/60"
          }`}
        >
          {totalCards}/50
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {confirmClear ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-white/50">Clear all?</span>
            <button
              onClick={() => {
                clearDeck();
                setConfirmClear(false);
              }}
              className="px-2 py-1 bg-red-500/70 hover:bg-red-500/90 text-white rounded text-xs transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-2 py-1 glass-btn-secondary rounded text-xs"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="px-3 py-1.5 glass-btn-secondary rounded text-xs"
          >
            Clear
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`px-4 py-1.5 rounded text-xs font-medium ${
            canSave && !saving
              ? "glass-btn-primary"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : deckId ? "Update Deck" : "Save Deck"}
        </button>
      </div>
    </div>
  );
}

function CardSearchPanel() {
  const [search, setSearch] = useState("");
  const [showLeaders, setShowLeaders] = useState(false);
  const [colorFilter, setColorFilter] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [detailCard, setDetailCard] = useState<Card | Leader | null>(null);
  const { addCard, setLeader, cards: deckCards } = useDeckBuilder();
  const agentResults = useDeckBuilder((s) => s.agentResults);
  const clearAgentResults = useDeckBuilder((s) => s.clearAgentResults);

  // Track recently added card IDs for animation feedback
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const timerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Build quantity map for badge display
  const deckQuantities: Record<string, number> = {};
  deckCards.forEach(({ card, quantity }) => {
    deckQuantities[card.id] = quantity;
  });

  const { data: sets } = useQuery({
    queryKey: ["sets"],
    queryFn: () => api.getSets(),
  });

  const { data: cards } = useQuery({
    queryKey: ["cards", search, colorFilter, setFilter, typeFilter],
    queryFn: () =>
      api.getCards({
        search: search || undefined,
        color: colorFilter || undefined,
        set_code: setFilter || undefined,
        type: typeFilter || undefined,
        limit: 50,
      }),
    enabled: !showLeaders,
  });

  const { data: leaders } = useQuery({
    queryKey: ["leaders", search, colorFilter, setFilter],
    queryFn: () =>
      api.getLeaders({
        search: search || undefined,
        color: colorFilter || undefined,
        set_code: setFilter || undefined,
        limit: 50,
      }),
    enabled: showLeaders,
  });

  const colors = ["Red", "Blue", "Green", "Purple", "Black", "Yellow"];
  const types = ["Character", "Event", "Stage"];

  const handleAddCard = (card: Card) => {
    addCard(card, 1);
    setRecentlyAdded((prev) => new Set(prev).add(card.id));

    // Clear existing timer for this card
    const existing = timerRef.current.get(card.id);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
      timerRef.current.delete(card.id);
    }, 400);
    timerRef.current.set(card.id, timeout);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timerRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="p-3 space-y-2">
      {/* Row 1: Tabs + Search + Set + Collapse toggle */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setShowLeaders(false)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              !showLeaders
                ? "bg-sky-500/70 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setShowLeaders(true)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              showLeaders
                ? "bg-sky-500/70 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Leaders
          </button>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 glass-input text-sm min-w-0"
        />

        <select
          value={setFilter}
          onChange={(e) => setSetFilter(e.target.value)}
          className="px-2 py-1.5 glass-select text-xs shrink-0 max-w-[120px]"
        >
          <option value="">All Sets</option>
          {sets?.map((set) => (
            <option key={set} value={set}>
              {set}
            </option>
          ))}
        </select>

        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="px-2 py-1.5 glass-btn-secondary rounded text-xs shrink-0"
          title={filtersExpanded ? "Collapse filters" : "Expand filters"}
        >
          {filtersExpanded ? "\u25B2" : "\u25BC"}
        </button>
      </div>

      {/* Row 2 (collapsible): Color circles + Type pills */}
      {filtersExpanded && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Color circles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setColorFilter("")}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                colorFilter === ""
                  ? "border-white bg-white/15 text-white"
                  : "border-white/20 text-white/40 hover:border-white/40"
              }`}
              title="All colors"
            >
              All
            </button>
            {colors.map((color) => (
              <button
                key={color}
                onClick={() =>
                  setColorFilter(colorFilter === color ? "" : color)
                }
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  colorFilter === color
                    ? "border-white scale-110 ring-2 ring-white/30"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: COLOR_MAP[color] }}
                title={color}
              />
            ))}
          </div>

          {/* Type pills (cards mode only) */}
          {!showLeaders && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTypeFilter("")}
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  typeFilter === ""
                    ? "bg-sky-500/70 text-white border-sky-400/30"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
              >
                All
              </button>
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setTypeFilter(typeFilter === type ? "" : type)
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    typeFilter === type
                      ? "bg-sky-500/70 text-white border-sky-400/30"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agent results banner */}
      {agentResults && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-400/30">
          <span className="text-xs text-sky-300 font-medium flex-1">
            Agent found {agentResults.length} card{agentResults.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={clearAgentResults}
            className="text-xs text-white/50 hover:text-white/80 transition-colors px-2 py-0.5 rounded bg-white/5 hover:bg-white/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Card/Leader image grid */}
      {agentResults ? (
        <div className="grid grid-cols-4 gap-2">
          {agentResults.map((item) =>
            "life" in item ? (
              <CardTooltip key={item.id} card={item}>
                <div
                  onClick={() => setLeader(item as Leader)}
                  className="cursor-pointer group"
                >
                  <div className="relative aspect-[2.5/3.5] rounded overflow-hidden border border-white/10 hover:border-sky-400/50 transition-all group-hover:scale-105">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs text-white/40">
                        No img
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailCard(item);
                      }}
                      className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="View details"
                    >
                      <InfoIcon />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-center mt-1.5 truncate text-white/70">
                    {item.name}
                  </p>
                </div>
              </CardTooltip>
            ) : (
              <SearchCardItem
                key={item.id}
                card={item as Card}
                quantity={deckQuantities[item.id] || 0}
                recentlyAdded={recentlyAdded.has(item.id)}
                onAdd={() => handleAddCard(item as Card)}
                onShowDetail={() => setDetailCard(item)}
              />
            )
          )}
        </div>
      ) : showLeaders ? (
        <div className="grid grid-cols-4 gap-2">
          {leaders?.map((leader) => (
            <CardTooltip key={leader.id} card={leader}>
              <div
                onClick={() => setLeader(leader)}
                className="cursor-pointer group"
              >
                <div className="relative aspect-[2.5/3.5] rounded overflow-hidden border border-white/10 hover:border-sky-400/50 transition-all group-hover:scale-105">
                  {leader.image_url ? (
                    <img
                      src={leader.image_url}
                      alt={leader.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs text-white/40">
                      No img
                    </div>
                  )}

                  {/* Info icon on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard(leader);
                    }}
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View details"
                  >
                    <InfoIcon />
                  </button>
                </div>
                <p className="text-xs font-medium text-center mt-1.5 truncate text-white/70">
                  {leader.name}
                </p>
              </div>
            </CardTooltip>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {cards?.map((card) => (
            <SearchCardItem
              key={card.id}
              card={card}
              quantity={deckQuantities[card.id] || 0}
              recentlyAdded={recentlyAdded.has(card.id)}
              onAdd={() => handleAddCard(card)}
              onShowDetail={() => setDetailCard(card)}
            />
          ))}
        </div>
      )}

      <CardDetailModal
        card={detailCard}
        onClose={() => setDetailCard(null)}
        mode="deck-builder"
        onAddCard={(card) => handleAddCard(card)}
        quantity={
          detailCard && !("life" in detailCard)
            ? deckQuantities[detailCard.id] || 0
            : 0
        }
      />
    </div>
  );
}

function SearchCardItem({
  card,
  quantity,
  recentlyAdded,
  onAdd,
  onShowDetail,
}: {
  card: Card;
  quantity: number;
  recentlyAdded: boolean;
  onAdd: () => void;
  onShowDetail: () => void;
}) {
  const maxed = quantity >= 4;

  return (
    <CardTooltip card={card}>
      <div
        onClick={onAdd}
        className={`cursor-pointer group transition-all duration-150 ${
          recentlyAdded ? "scale-95" : ""
        }`}
      >
        <div
          className={`relative aspect-[2.5/3.5] rounded overflow-hidden border transition-all duration-150 ${
            recentlyAdded
              ? "border-emerald-400 border-2 shadow-lg shadow-emerald-500/20"
              : "border-white/10 hover:border-sky-400/50"
          } group-hover:scale-105`}
        >
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center text-[10px] text-white/40 p-1 text-center">
              {card.name}
            </div>
          )}

          {/* Quantity badge */}
          {quantity > 0 && (
            <div
              className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                maxed ? "bg-red-500" : "bg-sky-500"
              } ${recentlyAdded ? "animate-bounce" : ""}`}
            >
              {quantity}
            </div>
          )}

          {/* Info icon on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowDetail();
            }}
            className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="View details"
          >
            <InfoIcon />
          </button>
        </div>
        <p className="text-xs font-medium text-center mt-1.5 truncate text-white/70">
          {card.name}
        </p>
      </div>
    </CardTooltip>
  );
}

function DeckPanel() {
  const {
    leader,
    cards,
    getTotalCards,
    getCostCurve,
    getColorDistribution,
    updateQuantity,
    removeCard,
  } = useDeckBuilder();

  const [detailCard, setDetailCard] = useState<Card | Leader | null>(null);

  const totalCards = getTotalCards();
  const costCurve = getCostCurve();
  const colorDist = getColorDistribution();

  // Build quantity map
  const deckQuantities: Record<string, number> = {};
  cards.forEach(({ card, quantity }) => {
    deckQuantities[card.id] = quantity;
  });

  // Average cost
  const avgCost =
    totalCards > 0
      ? (
          cards.reduce(
            (sum, c) => sum + (c.card.cost || 0) * c.quantity,
            0
          ) / totalCards
        ).toFixed(1)
      : "0";

  // Sort cards by cost then name, group by type
  const sortedCards = [...cards].sort((a, b) => {
    const costDiff = (a.card.cost || 0) - (b.card.cost || 0);
    if (costDiff !== 0) return costDiff;
    return a.card.name.localeCompare(b.card.name);
  });

  const grouped: Record<string, typeof cards> = {};
  sortedCards.forEach((dc) => {
    const type = dc.card.type || "Other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(dc);
  });

  // Type order
  const typeOrder = ["Character", "Event", "Stage", "Other"];
  const orderedTypes = typeOrder.filter((t) => grouped[t]);

  return (
    <div className="p-3 space-y-3">
      {/* Leader section */}
      {leader ? (
        <div className="flex gap-3 p-3 glass rounded-xl">
          {leader.image_url && (
            <img
              src={leader.image_url}
              alt={leader.name}
              className="w-20 h-28 object-cover rounded shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="font-bold text-sm truncate text-white">{leader.name}</h3>
              <p className="text-xs text-white/50">
                Life: {leader.life} | {leader.colors.join(", ")}
              </p>
              <p className="text-xs text-white/50">
                Avg Cost: {avgCost} | {cards.length} unique cards
              </p>
            </div>
            <DeckStatsBar costCurve={costCurve} colorDist={colorDist} />
          </div>
        </div>
      ) : (
        <div className="p-6 border border-dashed border-white/20 bg-white/5 rounded-xl text-center">
          <p className="text-sm text-white/50">
            Select a leader from the search panel
          </p>
        </div>
      )}

      {/* Radar chart */}
      {cards.length > 0 && <DeckRadarChart cards={cards} />}

      {/* Deck cards grouped by type */}
      {cards.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-white/20 bg-white/5 rounded-xl">
          <p className="text-sm text-white/50">
            Click cards in the search panel to add them
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedTypes.map((type) => {
            const typeCards = grouped[type];
            const typeCount = typeCards.reduce(
              (sum, dc) => sum + dc.quantity,
              0
            );
            return (
              <div key={type}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                  {type} ({typeCount})
                </h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {typeCards.map(({ card, quantity }) => (
                    <div key={card.id} className="relative group">
                      <div className="relative aspect-[2.5/3.5] rounded overflow-hidden border border-white/10">
                        {card.image_url ? (
                          <img
                            src={card.image_url}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center text-[9px] text-white/40 p-0.5 text-center">
                            {card.name}
                          </div>
                        )}

                        {/* Quantity badge */}
                        <div
                          className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                            quantity >= 4 ? "bg-red-500" : "bg-sky-500"
                          }`}
                        >
                          {quantity}
                        </div>

                        {/* Hover overlay with controls */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                updateQuantity(card.id, quantity - 1)
                              }
                              className="w-6 h-6 rounded bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                            >
                              -
                            </button>
                            <span className="text-white text-xs font-bold w-4 text-center">
                              {quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(card.id, quantity + 1)
                              }
                              className="w-6 h-6 rounded bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeCard(card.id)}
                              className="text-[9px] text-red-300 hover:text-red-100 transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setDetailCard(card)}
                              className="w-5 h-5 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
                              title="View details"
                            >
                              <InfoIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardDetailModal
        card={detailCard}
        onClose={() => setDetailCard(null)}
        mode="deck-builder"
        onAddCard={(card) => {
          const { addCard } = useDeckBuilder.getState();
          addCard(card, 1);
        }}
        quantity={
          detailCard && !("life" in detailCard)
            ? deckQuantities[detailCard.id] || 0
            : 0
        }
      />
    </div>
  );
}

/** Magnifying glass info icon */
function InfoIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="7" cy="7" r="5" />
      <line x1="11" y1="11" x2="14" y2="14" />
    </svg>
  );
}

// --- Radar Chart ---

const RADAR_AXES = [
  { key: "aggression", label: "AGG", name: "Aggression", desc: "Power-to-cost ratio" },
  { key: "speed", label: "SPD", name: "Speed", desc: "Low-cost cards (0–3)" },
  { key: "defense", label: "DEF", name: "Defense", desc: "Counter ability" },
  { key: "endgame", label: "END", name: "Endgame", desc: "High-cost cards (7+)" },
  { key: "versatility", label: "VRS", name: "Versatility", desc: "Events & stages" },
] as const;

function computeDeckScores(
  cards: { card: Card; quantity: number }[]
): Record<string, number> {
  const zero = { aggression: 0, speed: 0, defense: 0, endgame: 0, versatility: 0 };
  if (cards.length === 0) return zero;

  const allCards = cards.flatMap((dc) => Array(dc.quantity).fill(dc.card) as Card[]);
  const total = allCards.length;
  if (total === 0) return zero;

  const characters = allCards.filter((c) => c.type === "Character");

  // Aggression: avg power-to-cost ratio of characters, scaled
  const aggression =
    characters.length > 0
      ? Math.min(
          10,
          (characters.reduce(
            (s, c) => s + (c.power ?? 0) / Math.max(c.cost ?? 1, 1),
            0
          ) /
            characters.length) *
            2
        )
      : 0;

  // Speed: % of cards costing 0–3
  const lowCost = allCards.filter((c) => (c.cost ?? 0) <= 3).length;
  const speed = (lowCost / total) * 10;

  // Defense: avg counter of cards with counter > 0, normalized
  const withCounter = allCards.filter((c) => (c.counter ?? 0) > 0);
  const defense =
    withCounter.length > 0
      ? Math.min(
          10,
          ((withCounter.reduce((s, c) => s + (c.counter ?? 0), 0) /
            withCounter.length) /
            200) *
            10
        )
      : 0;

  // Endgame: % of cards costing 7+
  const highCost = allCards.filter((c) => (c.cost ?? 0) >= 7).length;
  const endgame = Math.min(10, (highCost / total) * 33.3);

  // Versatility: % of non-character cards
  const nonChar = allCards.filter((c) => c.type !== "Character").length;
  const versatility = Math.min(10, (nonChar / total) * 25);

  return { aggression, speed, defense, endgame, versatility };
}

/** Returns polygon point for a given axis index, value (0–10), and radius */
function radarPoint(index: number, value: number, radius: number): [number, number] {
  const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
  const r = (value / 10) * radius;
  return [100 + r * Math.cos(angle), 100 + r * Math.sin(angle)];
}

function DeckRadarChart({ cards }: { cards: { card: Card; quantity: number }[] }) {
  const scores = computeDeckScores(cards);
  const R = 70; // max radius

  // Build grid pentagons (33%, 66%, 100%)
  const gridLevels = [0.33, 0.66, 1];
  const gridPaths = gridLevels.map((level) => {
    const pts = RADAR_AXES.map((_, i) => radarPoint(i, 10 * level, R));
    return pts.map((p) => p.join(",")).join(" ");
  });

  // Axis lines from center to each vertex
  const axisLines = RADAR_AXES.map((_, i) => radarPoint(i, 10, R));

  // Data polygon
  const dataPoints = RADAR_AXES.map((a, i) =>
    radarPoint(i, scores[a.key], R)
  );
  const dataPath = dataPoints.map((p) => p.join(",")).join(" ");

  // Label positions (slightly beyond the outer ring)
  const labelPoints = RADAR_AXES.map((_, i) => radarPoint(i, 10, R + 16));

  return (
    <div className="glass rounded-xl p-3">
      <p className="text-[10px] text-white/40 mb-1">Deck Profile</p>
      <div className="flex items-center gap-3">
        {/* Chart */}
        <svg viewBox="0 0 200 200" className="w-[160px] shrink-0">
          {/* Grid pentagons */}
          {gridPaths.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
            />
          ))}

          {/* Axis lines */}
          {axisLines.map(([x, y], i) => (
            <line
              key={i}
              x1={100}
              y1={100}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          ))}

          {/* Data polygon */}
          <polygon
            points={dataPath}
            fill="rgba(56,189,248,0.15)"
            stroke="rgba(56,189,248,0.5)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{ transition: "all 300ms ease" }}
          />

          {/* Data points */}
          {dataPoints.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill="rgba(56,189,248,0.8)"
              style={{ transition: "all 300ms ease" }}
            />
          ))}

          {/* Labels */}
          {RADAR_AXES.map((axis, i) => {
            const [x, y] = labelPoints[i];
            return (
              <text
                key={axis.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                fontFamily="monospace"
              >
                {axis.label}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {RADAR_AXES.map((axis) => (
            <div key={axis.key} className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-mono font-semibold text-sky-400 w-7 shrink-0">
                {axis.label}
              </span>
              <div className="min-w-0">
                <span className="text-[10px] text-white/60">{axis.name}</span>
                <span className="text-[10px] text-white/30"> — {axis.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeckStatsBar({
  costCurve,
  colorDist,
}: {
  costCurve: Record<number, number>;
  colorDist: Record<string, number>;
}) {
  // Cost curve bar chart
  const costEntries = Object.entries(costCurve)
    .map(([cost, count]) => ({ cost: Number(cost), count }))
    .sort((a, b) => a.cost - b.cost);
  const maxCount = Math.max(...costEntries.map((e) => e.count), 1);

  // Color distribution
  const totalColorCards = Object.values(colorDist).reduce(
    (sum, c) => sum + c,
    0
  );

  return (
    <div className="space-y-2">
      {/* Cost curve */}
      {costEntries.length > 0 && (
        <div>
          <p className="text-[10px] text-white/40 mb-1">Cost Curve</p>
          <div className="flex items-end gap-0.5 h-10">
            {costEntries.map(({ cost, count }) => (
              <div
                key={cost}
                className="flex flex-col items-center flex-1 min-w-0"
              >
                <span className="text-[8px] text-white/40">
                  {count}
                </span>
                <div
                  className="w-full bg-sky-500/60 rounded-t min-h-[2px]"
                  style={{
                    height: `${(count / maxCount) * 24}px`,
                  }}
                />
                <span className="text-[8px] text-white/40 mt-0.5">
                  {cost}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color distribution stacked bar */}
      {totalColorCards > 0 && (
        <div>
          <p className="text-[10px] text-white/40 mb-1">Colors</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
            {Object.entries(colorDist).map(([color, count]) => (
              <div
                key={color}
                className="h-full transition-all duration-300"
                style={{
                  width: `${(count / totalColorCards) * 100}%`,
                  backgroundColor: COLOR_MAP[color] || "#6B7280",
                }}
                title={`${color}: ${count}`}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {Object.entries(colorDist).map(([color, count]) => (
              <div key={color} className="flex items-center gap-0.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: COLOR_MAP[color] || "#6B7280",
                  }}
                />
                <span className="text-[9px] text-white/40">
                  {color} {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
