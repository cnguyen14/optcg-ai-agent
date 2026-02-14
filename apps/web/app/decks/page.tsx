"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Deck, Card, Leader, DeckCard, ConversationSummary } from "@/types";
import { useChatStore } from "@/lib/stores/chatStore";
import CardDetailModal from "@/components/ui/CardDetailModal";

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const COLOR_MAP: Record<string, string> = {
  Red: "#DC2626",
  Blue: "#2563EB",
  Green: "#16A34A",
  Purple: "#9333EA",
  Black: "#374151",
  Yellow: "#EAB308",
};

function ColorStrip({ distribution }: { distribution?: Record<string, number> }) {
  if (!distribution) return null;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-t-xl">
      {Object.entries(distribution).map(([color, count]) => (
        <div
          key={color}
          className="h-full"
          style={{
            width: `${(count / total) * 100}%`,
            backgroundColor: COLOR_MAP[color] || "#6B7280",
          }}
        />
      ))}
    </div>
  );
}

function DeckBox({
  deck,
  onSelect,
  onDelete,
  onAnalyze,
  index,
}: {
  deck: Deck;
  onSelect: () => void;
  onDelete: () => void;
  onAnalyze: () => void;
  index: number;
}) {
  return (
    <div
      className={`relative group ${index < 8 ? `animate-glass-in stagger-${Math.min(index + 1, 6)}` : ""}`}
    >
      {/* Depth shadow layers (stacked-cards illusion) */}
      <div className="absolute -bottom-1.5 left-2 right-2 h-3 rounded-b-xl bg-white/[0.03] border border-white/[0.06] border-t-0" />
      <div className="absolute -bottom-3 left-4 right-4 h-3 rounded-b-xl bg-white/[0.02] border border-white/[0.04] border-t-0" />

      {/* Main card */}
      <div
        onClick={onSelect}
        className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
      >
        {/* Color strip at top */}
        <ColorStrip distribution={deck.color_distribution} />

        {/* Leader image */}
        {deck.leader?.image_url ? (
          <img
            src={deck.leader.image_url}
            alt={deck.leader.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
            <svg className="w-16 h-16 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Color strip overlay at very top */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <ColorStrip distribution={deck.color_distribution} />
        </div>

        {/* Build status badge */}
        <div className="absolute top-3 left-3 z-10">
          {deck.leader && deck.total_cards === 50 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/25 backdrop-blur-md border border-emerald-400/40 text-emerald-300 animate-breath-green shadow-[0_0_12px_rgba(52,211,153,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-breath-green-dot" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500/25 backdrop-blur-md border border-amber-400/40 text-amber-300 animate-breath-amber shadow-[0_0_12px_rgba(251,191,36,0.15)]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-breath-amber-dot" />
              {deck.total_cards}/50
            </span>
          )}
        </div>

        {/* Hover action buttons */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Link
            href={`/deck-builder?deckId=${deck.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
            title="Edit deck"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze();
            }}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 transition-colors"
            title="AI Analyze"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
            title="Delete deck"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Bottom text area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className="font-bold text-white text-lg leading-tight truncate">{deck.name}</h3>
          <p className="text-white/60 text-sm truncate mt-0.5">
            {deck.leader?.name || deck.leader_id}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
            <span>{deck.total_cards} cards</span>
            <span className="text-white/30">·</span>
            <span>Avg {deck.avg_cost?.toFixed(1) || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Group deck cards by type, sorted by cost then name
function groupCardsByType(deckCards: DeckCard[]) {
  const groups: Record<string, DeckCard[]> = {};
  const order = ["Character", "Event", "Stage"];

  for (const dc of deckCards) {
    const type = dc.card.type || "Other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(dc);
  }

  // Sort within each group by cost then name
  for (const type of Object.keys(groups)) {
    groups[type].sort((a, b) => {
      const costDiff = (a.card.cost ?? 99) - (b.card.cost ?? 99);
      if (costDiff !== 0) return costDiff;
      return a.card.name.localeCompare(b.card.name);
    });
  }

  // Return in canonical order
  const sorted: [string, DeckCard[]][] = [];
  for (const type of order) {
    if (groups[type]) sorted.push([type, groups[type]]);
  }
  for (const [type, cards] of Object.entries(groups)) {
    if (!order.includes(type)) sorted.push([type, cards]);
  }
  return sorted;
}

function ChatHistorySection({
  deckId,
  onClose,
}: {
  deckId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["deck-sessions", deckId],
    queryFn: () => api.getConversationsByDeck(deckId),
  });

  const handleLoadSession = async (session: ConversationSummary) => {
    onClose();
    const chatStore = useChatStore.getState();
    if (!chatStore.isOpen) chatStore.toggleOpen();

    // Set context with skipAutoLoad since we'll load explicitly
    setTimeout(async () => {
      await useChatStore.getState().setContext(deckId, "decks", true);
      await useChatStore.getState().loadConversation(session.id);
    }, 150);
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      await api.deleteConversation(sessionId);
      // Optimistic update: remove from cache immediately (avoids race with DB commit)
      queryClient.setQueryData<ConversationSummary[]>(
        ["deck-sessions", deckId],
        (old) => old?.filter((s) => s.id !== sessionId) ?? []
      );
      // Mark stale without immediate refetch (DB commit may not have landed yet)
      queryClient.invalidateQueries({
        queryKey: ["deck-sessions", deckId],
        refetchType: "none",
      });
      // If the deleted session is currently active in chat, clear it
      const chatState = useChatStore.getState();
      if (chatState.conversationId === sessionId) {
        chatState.clearChat();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteSessionId(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Chat History</h3>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="flex items-center gap-2 text-white/30 text-xs py-3">
          <div className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
          Loading sessions...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Chat History</h3>
        {sessions && sessions.length > 0 && (
          <span className="text-xs text-white/25">{sessions.length}</span>
        )}
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {!sessions || sessions.length === 0 ? (
        <p className="text-center text-white/25 text-xs py-4">No chat sessions yet</p>
      ) : (
        <div className="space-y-1.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="group/session relative flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => handleLoadSession(session)}
            >
              {/* Chat icon */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-sky-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 truncate">
                    {session.title || session.first_message_preview || "Chat session"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-white/25">
                    {formatRelativeDate(session.updated_at)}
                  </span>
                  <span className="text-[10px] text-white/15">·</span>
                  <span className="text-[10px] text-white/25">
                    {session.message_count} msg{session.message_count !== 1 ? "s" : ""}
                  </span>
                  {session.model && (
                    <>
                      <span className="text-[10px] text-white/15">·</span>
                      <span className="text-[10px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">
                        {session.model.split("/").pop()?.split("-").slice(0, 2).join("-") || session.model}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Delete button */}
              {confirmDeleteSessionId === session.id ? (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={deletingId === session.id}
                    className="px-2 py-1 text-[10px] font-medium bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {deletingId === session.id ? "..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteSessionId(null)}
                    className="px-2 py-1 text-[10px] font-medium text-white/50 hover:text-white/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteSessionId(session.id);
                  }}
                  className="flex-shrink-0 opacity-0 group-hover/session:opacity-100 p-1.5 rounded-md hover:bg-red-500/15 text-white/25 hover:text-red-400 transition-all"
                  title="Delete session"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeckDetailModal({
  deckId,
  onClose,
  onEdit,
  onAnalyze,
  onDelete,
}: {
  deckId: string;
  onClose: () => void;
  onEdit: () => void;
  onAnalyze: () => void;
  onDelete: () => void;
}) {
  const [selectedCard, setSelectedCard] = useState<Card | Leader | null>(null);

  const { data: deck, isLoading } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => api.getDeck(deckId),
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedCard) {
          setSelectedCard(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, selectedCard]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const grouped = deck?.deck_cards ? groupCardsByType(deck.deck_cards) : [];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <div
          className="relative glass w-full max-w-3xl max-h-[85vh] flex flex-col animate-glass-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {isLoading ? (
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
              <p className="text-white/40 text-sm">Loading deck...</p>
            </div>
          ) : deck ? (
            <>
              {/* Header: Leader + deck info */}
              <div className="flex gap-4 p-5 pb-4 border-b border-white/10">
                {/* Leader thumbnail */}
                <div className="w-20 h-28 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  {deck.leader?.image_url ? (
                    <img
                      src={deck.leader.image_url}
                      alt={deck.leader.name}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => deck.leader && setSelectedCard(deck.leader)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Deck info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold gradient-text truncate pr-10">{deck.name}</h2>
                  <p className="text-sm text-white/50 mt-0.5 truncate">
                    {deck.leader?.name || deck.leader_id}
                    {deck.leader?.colors?.length ? ` \u2022 ${deck.leader.colors.join("/")}` : ""}
                  </p>
                  {deck.description && (
                    <p className="text-xs text-white/35 mt-1 line-clamp-2">{deck.description}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      deck.total_cards === 50
                        ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
                        : "bg-amber-500/20 border border-amber-400/30 text-amber-300"
                    }`}>
                      {deck.total_cards}/50
                    </span>
                    {deck.avg_cost !== undefined && (
                      <span className="text-xs text-white/40">
                        Avg cost <span className="text-white/70 font-medium">{deck.avg_cost.toFixed(1)}</span>
                      </span>
                    )}
                    {deck.color_distribution && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        {Object.entries(deck.color_distribution).map(([color, count]) => (
                          <span
                            key={color}
                            className="flex items-center gap-1 text-xs text-white/50"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: COLOR_MAP[color] || "#6B7280" }}
                            />
                            {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card grid — scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {grouped.length === 0 ? (
                  <p className="text-center text-white/30 text-sm py-8">No cards in this deck</p>
                ) : (
                  grouped.map(([type, cards]) => (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">{type}</h3>
                        <span className="text-xs text-white/25">
                          {cards.reduce((sum, dc) => sum + dc.quantity, 0)}
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {cards.map((dc) => (
                          <button
                            key={dc.id}
                            onClick={() => setSelectedCard(dc.card)}
                            className="relative group/card rounded-lg overflow-hidden bg-white/5 aspect-[2.5/3.5] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
                          >
                            {dc.card.image_url ? (
                              <img
                                src={dc.card.image_url}
                                alt={dc.card.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <span className="text-[9px] text-white/30 text-center leading-tight">{dc.card.name}</span>
                              </div>
                            )}
                            {/* Quantity badge */}
                            {dc.quantity > 1 && (
                              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-sky-500/90 text-[10px] font-bold text-white shadow-md">
                                {dc.quantity}
                              </span>
                            )}
                            {/* Hover name overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-1 px-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <p className="text-[9px] text-white text-center truncate leading-tight">{dc.card.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Chat History */}
                <ChatHistorySection deckId={deckId} onClose={onClose} />
              </div>

              {/* Footer actions */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-white/10">
                <Link
                  href={`/deck-builder?deckId=${deck.id}`}
                  onClick={onEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium glass-btn-secondary rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Edit
                </Link>
                <button
                  onClick={onAnalyze}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium glass-btn-primary rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Analyze
                </button>
                <button
                  onClick={onDelete}
                  className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-white/40 text-sm">
              Deck not found
            </div>
          )}
        </div>
      </div>

      {/* Card detail sub-modal */}
      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </>
  );
}

export default function DecksPage() {
  const queryClient = useQueryClient();
  const setContext = useChatStore((s) => s.setContext);
  const [viewDeckId, setViewDeckId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync viewed deck to chat context
  useEffect(() => {
    setContext(viewDeckId, "decks");
  }, [viewDeckId, setContext]);

  // Clear context on unmount
  useEffect(() => {
    return () => {
      useChatStore.getState().setContext(null, null);
    };
  }, []);

  // Fetch ALL decks (no is_public filter)
  const { data: decks, isLoading } = useQuery({
    queryKey: ["decks"],
    queryFn: () => api.getDecks({ limit: 50 }),
  });

  // Close delete modal on Escape
  useEffect(() => {
    if (!confirmDeleteId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDeleteId(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [confirmDeleteId]);

  const deleteMutation = useMutation({
    mutationFn: (deckId: string) => api.deleteDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      setConfirmDeleteId(null);
      setViewDeckId(null);
    },
  });

  const handleAnalyzeDeck = (deckId: string) => {
    const deck = decks?.find((d) => d.id === deckId);
    if (!deck) return;

    setViewDeckId(null); // Close modal

    const chatStore = useChatStore.getState();
    if (!chatStore.isOpen) {
      chatStore.toggleOpen();
    }

    // Set context inside setTimeout so it runs AFTER the viewDeckId→null useEffect clears it
    setTimeout(async () => {
      await useChatStore.getState().setContext(deckId, "decks");
      useChatStore.getState().sendMessage(
        `Analyze my deck "${deck.name}" (leader: ${deck.leader?.name || deck.leader_id}). ` +
        `Give me a comprehensive analysis including synergies, cost curve evaluation, ` +
        `strengths, weaknesses, and specific card recommendations for improvement.`
      );
    }, 150);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-glass-in">
        <h1 className="text-4xl font-bold text-white">Decks</h1>
        <Link
          href="/deck-builder"
          className="px-4 py-2 glass-btn-primary rounded-lg"
        >
          New Deck
        </Link>
      </div>

      {/* Deck Box Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`animate-glass-in stagger-${Math.min(i + 1, 4)}`}>
              <div className="aspect-[3/4] glass-skeleton rounded-xl" />
              <div className="h-3 -mt-1 mx-2 rounded-b-xl bg-white/[0.03]" />
              <div className="h-3 -mt-1 mx-4 rounded-b-xl bg-white/[0.02]" />
            </div>
          ))}
        </div>
      ) : decks && decks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {decks.map((deck, i) => (
            <DeckBox
              key={deck.id}
              deck={deck}
              onSelect={() => setViewDeckId(deck.id)}
              onDelete={() => setConfirmDeleteId(deck.id)}
              onAnalyze={() => handleAnalyzeDeck(deck.id)}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 border border-dashed border-white/20 bg-white/5 rounded-xl text-center animate-glass-in">
          <svg className="mx-auto w-16 h-16 text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-white/50 text-lg mb-2">No decks yet</p>
          <Link
            href="/deck-builder"
            className="inline-flex items-center gap-2 px-5 py-2.5 glass-btn-primary rounded-lg mt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Your First Deck
          </Link>
        </div>
      )}

      {/* Deck Detail Modal */}
      {viewDeckId && (
        <DeckDetailModal
          deckId={viewDeckId}
          onClose={() => setViewDeckId(null)}
          onEdit={() => setViewDeckId(null)}
          onAnalyze={() => handleAnalyzeDeck(viewDeckId)}
          onDelete={() => {
            setViewDeckId(null);
            setConfirmDeleteId(viewDeckId);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative glass w-full max-w-md p-6 animate-glass-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h3 className="text-center text-xl font-bold text-white">
              Delete Deck
            </h3>

            <p className="mt-3 text-center text-sm leading-relaxed text-white/60">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {decks?.find((d) => d.id === confirmDeleteId)?.name || "this deck"}
              </span>
              ? This action is permanent and cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium glass-btn-secondary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500/80 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete Forever"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
