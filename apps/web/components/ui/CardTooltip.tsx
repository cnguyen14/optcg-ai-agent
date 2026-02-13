"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, Leader } from "@/types";
import { FormattedCardText } from "@/components/ui/CardTextFormatter";

interface CardTooltipProps {
  card: Card | Leader;
  children: React.ReactNode;
}

function isLeader(card: Card | Leader): card is Leader {
  return "life" in card;
}

export default function CardTooltip({ card, children }: CardTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"right" | "left">("right");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const tooltipWidth = 272; // w-64 (256px) + ml-2 (8px) + buffer

        // Find the closest scrollable/overflow ancestor
        let containerRight = window.innerWidth;
        let parent = wrapperRef.current.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          const overflowX = style.overflowX;
          const overflowY = style.overflowY;
          if (
            overflowX === "auto" ||
            overflowX === "scroll" ||
            overflowX === "hidden" ||
            overflowY === "auto" ||
            overflowY === "scroll"
          ) {
            containerRight = parent.getBoundingClientRect().right;
            break;
          }
          parent = parent.parentElement;
        }

        const spaceRight = containerRight - rect.right;
        setPosition(spaceRight < tooltipWidth ? "left" : "right");
      }
      setVisible(true);
    }, 200);
  }, []);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const leader = isLeader(card);
  const color = leader ? card.colors.join(", ") : card.color;

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 glass-tooltip p-3 max-w-xs w-64 pointer-events-none ${
            position === "right" ? "left-full ml-2" : "right-full mr-2"
          } top-0`}
        >
          <p className="font-bold text-sm gradient-text truncate">{card.name}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {leader ? "Leader" : card.type}
            {color ? ` \u2022 ${color}` : ""}
          </p>

          <div className="flex gap-3 mt-2 text-xs">
            {!leader && card.cost !== undefined && (
              <div>
                <span className="text-white/40">Cost </span>
                <span className="text-white font-semibold">{card.cost}</span>
              </div>
            )}
            {card.power !== undefined && (
              <div>
                <span className="text-white/40">Power </span>
                <span className="text-white font-semibold">{card.power}</span>
              </div>
            )}
            {!leader && (card as Card).counter !== undefined && (
              <div>
                <span className="text-white/40">Counter </span>
                <span className="text-white font-semibold">
                  {(card as Card).counter}
                </span>
              </div>
            )}
            {leader && (
              <div>
                <span className="text-white/40">Life </span>
                <span className="text-white font-semibold">{card.life}</span>
              </div>
            )}
          </div>

          {card.attribute && (
            <p className="text-[10px] text-white/40 mt-1">
              {card.attribute}
            </p>
          )}

          {card.text && (
            <div className="text-xs text-white/70 mt-2">
              <FormattedCardText text={card.text} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
