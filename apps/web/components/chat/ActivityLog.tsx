"use client";

import { ActivityEntry } from "@/types";
import { TOOL_LABELS } from "./ToolUseIndicator";

interface ActivityLogProps {
  entries: ActivityEntry[];
}

export default function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) return null;

  const doneCount = entries.filter((e) => e.status === "done").length;
  const activeEntry = entries.find((e) => e.status === "active");

  // Show active tool, or fall back to the last completed tool
  const lastDone = [...entries].reverse().find((e) => e.status === "done");
  const displayEntry = activeEntry || lastDone;
  const label = displayEntry
    ? TOOL_LABELS[displayEntry.label] || displayEntry.label
    : "Processing...";

  return (
    <div className="flex justify-start mb-2">
      <div className="activity-indicator">
        <div className="activity-shimmer" />

        <div className="flex items-center gap-2.5 relative z-10">
          {/* Blinking dot */}
          <div className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-sky-400/70 activity-pulse" />
            <div className="absolute inset-0 rounded-full bg-sky-400/20 activity-ping" />
          </div>

          <span className="text-xs font-medium text-white/70 tracking-wide">
            {label}
          </span>

          {doneCount > 0 && (
            <span className="ml-auto text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full tabular-nums">
              {doneCount} done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
