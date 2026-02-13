"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/stores/chatStore";
import ChatMessage from "./ChatMessage";
import MarkdownContent from "./MarkdownContent";
import ThinkingIndicator from "./ThinkingIndicator";
import ToolUseIndicator from "./ToolUseIndicator";

export default function ChatMessages() {
  const {
    messages,
    isStreaming,
    currentThinking,
    currentToolUse,
    streamingText,
  } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, currentThinking, currentToolUse]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="text-4xl mb-3">🏴‍☠️</div>
          <p className="text-white/50 text-sm">
            Ask me about OPTCG rules, deck strategies, card searches, or deck analysis!
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Streaming indicators */}
      {isStreaming && (
        <>
          {currentThinking.length > 0 && (
            <ThinkingIndicator thoughts={currentThinking} />
          )}
          {currentToolUse && (
            <ToolUseIndicator
              tool={currentToolUse.tool}
              args={currentToolUse.args}
            />
          )}
          {streamingText && (
            <div className="flex justify-start mb-3">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-white/5 text-white/90 text-sm leading-relaxed">
                <MarkdownContent content={streamingText} />
                <span className="inline-block w-1.5 h-4 bg-sky-400/60 ml-0.5 animate-pulse" />
              </div>
            </div>
          )}
          {!streamingText && !currentToolUse && currentThinking.length === 0 && (
            <div className="flex justify-start mb-3">
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
