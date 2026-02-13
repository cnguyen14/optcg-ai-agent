"use client";

import { useChatStore } from "@/lib/stores/chatStore";

export default function ChatButton() {
  const { isOpen, toggleOpen, isStreaming } = useChatStore();

  if (isOpen) return null;

  return (
    <button
      onClick={toggleOpen}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full glass-btn-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      aria-label="Open chat"
    >
      <div className="relative">
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        {isStreaming && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-sky-400 rounded-full animate-pulse" />
        )}
      </div>
    </button>
  );
}
