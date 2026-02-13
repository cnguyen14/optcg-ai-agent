import React from "react";

/**
 * Parses card effect text and renders [bracketed keywords] as styled badges.
 * e.g. "[On Play]", "[Once Per Turn]", "[On Your Opponent's Attack]"
 */
export function FormattedCardText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(\[[^\]]+\])/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("[") && part.endsWith("]")) {
          const keyword = part.slice(1, -1);
          return (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-sky-500/25 text-sky-300 text-[11px] font-semibold border border-sky-400/30 leading-tight align-baseline"
            >
              {keyword}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
