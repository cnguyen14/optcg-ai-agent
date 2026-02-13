"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function DecksPage() {
  const queryClient = useQueryClient();
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [analysis, setAnalysis] = useState<any>(null);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 animate-glass-in">
        <h1 className="text-4xl font-bold text-white">Decks</h1>
        <Link
          href="/deck-builder"
          className="px-4 py-2 glass-btn-primary rounded-lg"
        >
          New Deck
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Deck List */}
        <div className="animate-glass-in stagger-1">
          <h2 className="text-2xl font-semibold text-white mb-4">Your Decks</h2>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : decks && decks.length > 0 ? (
            <div className="space-y-4">
              {decks.map((deck, i) => (
                <div
                  key={deck.id}
                  onClick={() => setSelectedDeck(deck.id)}
                  className={`glass-card p-4 cursor-pointer ${
                    i < 6 ? `animate-glass-in stagger-${Math.min(i + 1, 6)}` : ""
                  } ${
                    selectedDeck === deck.id
                      ? "border-sky-400/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white">{deck.name}</h3>
                      {deck.description && (
                        <p className="text-sm text-white/50 mb-2">
                          {deck.description}
                        </p>
                      )}
                      <div className="flex gap-4 text-sm text-white/60">
                        <span>
                          Leader: {deck.leader?.name || deck.leader_id}
                        </span>
                        <span>{deck.total_cards} cards</span>
                        <span>
                          Avg Cost: {deck.avg_cost?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                      {deck.color_distribution && (
                        <div className="mt-2 text-sm text-white/50">
                          Colors:{" "}
                          {Object.entries(deck.color_distribution)
                            .map(([color, count]) => `${color} (${count})`)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <Link
                        href={`/deck-builder?deckId=${deck.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 text-sm glass-btn-secondary rounded-lg"
                      >
                        Edit
                      </Link>
                      {confirmDeleteId === deck.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => deleteMutation.mutate(deck.id)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 text-xs bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
                          >
                            {deleteMutation.isPending ? "..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs glass-btn-secondary rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(deck.id);
                          }}
                          className="px-3 py-1 text-sm bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-white/20 bg-white/5 rounded-xl text-center">
              <p className="text-white/50">No decks yet.</p>
              <Link
                href="/deck-builder"
                className="text-sky-400 underline mt-2 inline-block hover:text-sky-300"
              >
                Create your first deck
              </Link>
            </div>
          )}
        </div>

        {/* Analysis Panel */}
        <div className="animate-glass-in stagger-2">
          <h2 className="text-2xl font-semibold text-white mb-4">AI Analysis</h2>

          {!selectedDeck ? (
            <div className="p-8 border border-dashed border-white/20 bg-white/5 rounded-xl text-center text-white/50">
              Select a deck to see AI analysis
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Provider Selection */}
              <div className="glass p-4 space-y-3">
                <h3 className="font-semibold text-white">AI Provider</h3>

                {availableProviders.length === 0 ? (
                  <p className="text-sm text-red-400">
                    No AI providers configured. Please add API keys to .env
                  </p>
                ) : (
                  <>
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

                    {currentProvider && currentProvider.models.length > 1 && (
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
                    )}

                    <button
                      onClick={handleAnalyze}
                      disabled={analyzeMutation.isPending}
                      className="w-full px-4 py-2 glass-btn-primary rounded-lg"
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
                <div className="glass p-8">
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
                <div className="glass p-6 space-y-4">
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
          )}
        </div>
      </div>
    </div>
  );
}
