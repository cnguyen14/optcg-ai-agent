"use client";

import { ChatMessage as ChatMessageType } from "@/types";
import MarkdownContent from "./MarkdownContent";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-sky-500/30 text-white rounded-br-md"
            : "bg-white/[0.08] text-gray-100 rounded-bl-md"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">
            {message.content || ""}
          </div>
        ) : (
          <MarkdownContent content={message.content || ""} />
        )}
      </div>
    </div>
  );
}
