"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card } from "@/types";
import CardTooltip from "@/components/ui/CardTooltip";
import CardDetailModal from "@/components/ui/CardDetailModal";

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [setFilter, setSetFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: sets } = useQuery({
    queryKey: ["sets"],
    queryFn: () => api.getSets(),
  });

  const { data: cards, isLoading } = useQuery({
    queryKey: ["cards", search, colorFilter, setFilter, typeFilter],
    queryFn: () =>
      api.getCards({
        search: search || undefined,
        color: colorFilter || undefined,
        set_code: setFilter || undefined,
        type: typeFilter || undefined,
        limit: 100,
      }),
  });

  const colors = ["Red", "Blue", "Green", "Purple", "Black", "Yellow"];
  const types = ["Character", "Event", "Stage"];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8 animate-glass-in">
        Card Browser
      </h1>

      {/* Filters */}
      <div className="glass p-4 mb-8 space-y-4 animate-glass-in stagger-1">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 glass-input"
          />
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="px-4 py-2 glass-select"
          >
            <option value="">All Sets</option>
            {sets?.map((set) => (
              <option key={set} value={set}>
                {set}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-2 text-sm text-white/45">Type:</span>
          <button
            onClick={() => setTypeFilter("")}
            className={`px-4 py-2 rounded-lg ${
              typeFilter === ""
                ? "bg-sky-500/70 text-white border border-sky-400/30"
                : "glass-btn-secondary"
            }`}
          >
            All
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg ${
                typeFilter === type
                  ? "bg-sky-500/70 text-white border border-sky-400/30"
                  : "glass-btn-secondary"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Color Filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-2 text-sm text-white/45">Color:</span>
          <button
            onClick={() => setColorFilter("")}
            className={`px-4 py-2 rounded-lg ${
              colorFilter === ""
                ? "bg-sky-500/70 text-white border border-sky-400/30"
                : "glass-btn-secondary"
            }`}
          >
            All
          </button>
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setColorFilter(color)}
              className={`px-4 py-2 rounded-lg ${
                colorFilter === color
                  ? "bg-sky-500/70 text-white border border-sky-400/30"
                  : "glass-btn-secondary"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`animate-glass-in ${i < 6 ? `stagger-${i + 1}` : ""}`}
            >
              <div className="glass-skeleton aspect-[2.5/3.5] rounded-lg mb-2" />
              <div className="glass-skeleton h-4 rounded w-3/4 mb-1" />
              <div className="glass-skeleton h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {cards?.map((card, i) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => setSelectedCard(card)}
              className={
                i < 24
                  ? `animate-glass-in ${i < 6 ? `stagger-${i + 1}` : ""}`
                  : ""
              }
            />
          ))}
        </div>
      )}

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        mode="browse"
      />
    </div>
  );
}

function CardItem({
  card,
  onClick,
  className = "",
}: {
  card: Card;
  onClick: () => void;
  className?: string;
}) {
  return (
    <CardTooltip card={card}>
      <div
        onClick={onClick}
        className={`glass-card p-3 cursor-pointer ${className}`}
      >
        <div className="aspect-[2.5/3.5] bg-white/5 rounded mb-2 flex items-center justify-center overflow-hidden group">
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span className="text-white/30 text-sm">No Image</span>
          )}
        </div>
        <h3 className="font-semibold text-sm truncate text-white">
          {card.name}
        </h3>
        <div className="text-xs text-white/50 space-y-1 mt-1">
          <p>
            {card.color} &bull; {card.type}
          </p>
          {card.cost !== undefined && <p>Cost: {card.cost}</p>}
          {card.power !== undefined && <p>Power: {card.power}</p>}
        </div>
      </div>
    </CardTooltip>
  );
}
