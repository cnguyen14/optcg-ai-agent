"use client";

interface ToolUseIndicatorProps {
  tool: string;
  args?: Record<string, unknown>;
}

const TOOL_LABELS: Record<string, string> = {
  search_cards: "Searching cards",
  get_deck_info: "Loading deck",
  validate_deck: "Validating deck",
  search_knowledge: "Searching rules",
  calculate_stats: "Calculating stats",
  response: "Composing response",
};

export default function ToolUseIndicator({ tool, args }: ToolUseIndicatorProps) {
  const label = TOOL_LABELS[tool] || tool;

  return (
    <div className="mx-3 mb-2 flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-sky-400/50 border-t-sky-400 rounded-full animate-spin" />
      <span className="text-xs text-sky-400/70">{label}</span>
    </div>
  );
}
