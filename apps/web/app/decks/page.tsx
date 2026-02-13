"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Deck } from "@/types";
import { useChatStore } from "@/lib/stores/chatStore";

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
  isSelected,
  onSelect,
  onDelete,
  index,
}: {
  deck: Deck;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
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
        className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] ${
          isSelected
            ? "ring-2 ring-sky-400/50 shadow-[0_0_25px_rgba(14,165,233,0.2)]"
            : ""
        }`}
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

export default function DecksPage() {
  const queryClient = useQueryClient();
  const setContext = useChatStore((s) => s.setContext);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [analysis, setAnalysis] = useState<any>(null);
  const analysisPanelRef = useRef<HTMLDivElement>(null);

  // Sync selected deck to chat context
  useEffect(() => {
    setContext(selectedDeck, "decks");
  }, [selectedDeck, setContext]);

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

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.getProviders(),
  });

  // Set default provider when providers are loaded
  useEffect(() => {
    if (providers && !selectedProvider) {
      setSelectedProvider(providers.default_provider);
    }
  }, [providers, selectedProvider]);

  // Close delete modal on Escape
  useEffect(() => {
    if (!confirmDeleteId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDeleteId(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [confirmDeleteId]);

  // Scroll analysis panel into view when deck is selected
  useEffect(() => {
    if (selectedDeck && analysisPanelRef.current) {
      setTimeout(() => {
        analysisPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDeck]);

  const analyzeMutation = useMutation({
    mutationFn: (options: {
      deckId: string;
      provider?: string;
      model?: string;
    }) =>
      api.analyzeDeck(options.deckId, {
        provider: options.provider,
        model: options.model,
      }),
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (deckId: string) => api.deleteDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      setConfirmDeleteId(null);
      if (selectedDeck) {
        setSelectedDeck(null);
        setAnalysis(null);
      }
    },
  });

  const availableProviders =
    providers?.providers.filter((p) => p.available) || [];
  const currentProvider = availableProviders.find(
    (p) => p.id === selectedProvider
  );

  const handleAnalyze = () => {
    if (!selectedDeck) return;

    analyzeMutation.mutate({
      deckId: selectedDeck,
      provider: selectedProvider,
      model: selectedModel || undefined,
    });
  };

  const handleSelectDeck = (deckId: string) => {
    if (selectedDeck === deckId) {
      // Toggle off
      setSelectedDeck(null);
      setAnalysis(null);
    } else {
      setSelectedDeck(deckId);
      setAnalysis(null);
    }
  };

  const selectedDeckData = decks?.find((d) => d.id === selectedDeck);

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
              isSelected={selectedDeck === deck.id}
              onSelect={() => handleSelectDeck(deck.id)}
              onDelete={() => setConfirmDeleteId(deck.id)}
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

      {/* Analysis Panel — below grid, conditional */}
      {selectedDeck && selectedDeckData && (
        <div ref={analysisPanelRef} className="mt-8 animate-glass-in">
          <div className="glass p-6">
            {/* Analysis header with selected deck info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {selectedDeckData.leader?.image_url && (
                  <img
                    src={selectedDeckData.leader.image_url}
                    alt={selectedDeckData.leader.name}
                    className="w-12 h-16 object-cover rounded-lg border border-white/10"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Analysis</h2>
                  <p className="text-sm text-white/50">{selectedDeckData.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedDeck(null); setAnalysis(null); }}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* AI Provider Selection */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
              {availableProviders.length === 0 ? (
                <p className="text-sm text-red-400">
                  No AI providers configured. Please add API keys to .env
                </p>
              ) : (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-white/50 mb-1.5">Provider</label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => {
                        setSelectedProvider(e.target.value);
                        setSelectedModel("");
                      }}
                      className="w-full px-3 py-2 glass-select"
                    >
                      {availableProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentProvider && currentProvider.models.length > 1 && (
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs text-white/50 mb-1.5">Model</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 glass-select"
                      >
                        <option value="">
                          Default ({currentProvider.default_model})
                        </option>
                        {currentProvider.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending}
                    className="px-6 py-2 glass-btn-primary rounded-lg whitespace-nowrap"
                  >
                    {analyzeMutation.isPending
                      ? "Analyzing..."
                      : "Analyze Deck"}
                  </button>
                </>
              )}
            </div>

            {/* Analysis Results */}
            {analyzeMutation.isPending ? (
              <div className="p-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-6 h-6 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                  <p className="text-white/70">Analyzing deck...</p>
                </div>
                <div className="space-y-2">
                  <div className="glass-skeleton h-4 rounded" />
                  <div className="glass-skeleton h-4 rounded w-5/6" />
                  <div className="glass-skeleton h-4 rounded w-4/6" />
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-white">{analysis.deck_name}</h3>
                  <span className="text-xs bg-white/10 border border-white/10 text-white/70 px-2 py-1 rounded-lg">
                    {analysis.provider}
                    {analysis.model && ` (${analysis.model})`}
                  </span>
                </div>

                <div className="prose prose-sm prose-invert max-w-none text-white/80">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: analysis.analysis.replace(/\n/g, "<br/>"),
                    }}
                  />
                </div>

                {analysis.synergies && analysis.synergies.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-white mb-2">Detected Synergies</h4>
                    <div className="text-sm space-y-1">
                      {analysis.synergies.map((synergy: any, i: number) => (
                        <div key={i} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/70">
                          {JSON.stringify(synergy)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
