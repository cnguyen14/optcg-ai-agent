"use client";

import { useState } from "react";

interface ThinkingIndicatorProps {
  thoughts: string[];
}

export default function ThinkingIndicator({ thoughts }: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thoughts.length) return null;

  return (
    <div className="mx-3 mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        <span className="w-2 h-2 bg-sky-400/60 rounded-full animate-pulse" />
        <span>Thinking...</span>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-1 pl-4 border-l border-white/10 text-xs text-white/30 space-y-1">
          {thoughts.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      )}
    </div>
  );
}
