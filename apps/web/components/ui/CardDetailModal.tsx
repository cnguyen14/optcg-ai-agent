"use client";

import { useEffect, useCallback } from "react";
import { Card, Leader } from "@/types";
import { FormattedCardText } from "@/components/ui/CardTextFormatter";

interface CardDetailModalProps {
  card: Card | Leader | null;
  onClose: () => void;
  mode?: "browse" | "deck-builder";
  onAddCard?: (card: Card) => void;
  quantity?: number;
}

function isLeader(card: Card | Leader): card is Leader {
  return "life" in card;
}

export default function CardDetailModal({
  card,
  onClose,
  mode = "browse",
  onAddCard,
  quantity = 0,
}: CardDetailModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (card) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [card, handleKeyDown]);

  if (!card) return null;

  const leader = isLeader(card);
  const color = leader ? card.colors.join(", ") : card.color;
  const maxed = quantity >= 4;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal panel */}
      <div
        className="relative glass max-w-2xl w-full animate-glass-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Content: two-column layout */}
        <div className="flex flex-col sm:flex-row gap-4 p-5">
          {/* Left: Card image */}
          <div className="sm:w-[45%] shrink-0">
            <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden bg-white/5">
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h2 className="text-lg font-bold gradient-text">{card.name}</h2>
            <p className="text-sm text-white/50 mt-0.5">
              {leader ? "Leader" : card.type}
              {color ? ` \u2022 ${color}` : ""}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {!leader && card.cost !== undefined && (
                <StatBox label="Cost" value={card.cost} />
              )}
              {card.power !== undefined && (
                <StatBox label="Power" value={card.power} />
              )}
              {!leader && (card as Card).counter !== undefined && (
                <StatBox label="Counter" value={(card as Card).counter!} />
              )}
              {leader && <StatBox label="Life" value={card.life} />}
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
              {card.attribute && (
                <div>
                  <span className="text-white/40">Attribute: </span>
                  <span className="text-white/80">{card.attribute}</span>
                </div>
              )}
              {!leader && (card as Card).rarity && (
                <div>
                  <span className="text-white/40">Rarity: </span>
                  <span className="text-white/80">
                    {(card as Card).rarity}
                  </span>
                </div>
              )}
              {card.set_code && (
                <div>
                  <span className="text-white/40">Set: </span>
                  <span className="text-white/80">{card.set_code}</span>
                </div>
              )}
              {card.category && (
                <div>
                  <span className="text-white/40">Category: </span>
                  <span className="text-white/80">{card.category}</span>
                </div>
              )}
              {leader && card.featured_character && (
                <div>
                  <span className="text-white/40">Featured: </span>
                  <span className="text-white/80">
                    {card.featured_character}
                  </span>
                </div>
              )}
            </div>

            {/* Effect text */}
            {card.text && (
              <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 flex-1 overflow-y-auto max-h-40">
                <p className="text-xs text-white/40 mb-1 font-medium">Effect</p>
                <FormattedCardText
                  text={card.text}
                  className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap"
                />
              </div>
            )}

            {/* Trigger */}
            {!leader && (card as Card).trigger && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-300/70 font-medium">Trigger</p>
                <FormattedCardText
                  text={(card as Card).trigger!}
                  className="text-sm text-amber-200/90"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer: deck builder actions */}
        {mode === "deck-builder" && !leader && onAddCard && (
          <div className="px-5 pb-4 pt-1 flex items-center justify-between border-t border-white/10 mt-1">
            <div className="text-sm text-white/50">
              {quantity > 0 ? (
                <span>
                  In deck:{" "}
                  <span
                    className={`font-bold ${maxed ? "text-red-400" : "text-sky-400"}`}
                  >
                    {quantity}/4
                  </span>
                </span>
              ) : (
                <span>Not in deck</span>
              )}
            </div>
            <button
              onClick={() => onAddCard(card as Card)}
              disabled={maxed}
              className="px-4 py-2 rounded-lg text-sm font-medium glass-btn-primary"
            >
              {maxed ? "Max copies (4)" : "Add to Deck"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
      <p className="text-[10px] text-white/40 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}
