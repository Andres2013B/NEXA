"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/nexa/chat-types";
import { AIMessage } from "./AIMessage";
import { TypingIndicator } from "./TypingIndicator";

export function AIMessageList({
  messages,
  isLoading,
  onRetry,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  onRetry: (assistantId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const lastMessage = messages[messages.length - 1];
  const showTyping =
    isLoading && lastMessage?.role === "assistant" && !lastMessage.content && !lastMessage.image;

  return (
    <div
      ref={scrollRef}
      className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      aria-live="polite"
    >
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-neutral-400 dark:text-neutral-600">
          <span className="text-2xl">✦</span>
          <p className="text-sm">Pregúntame lo que quieras…</p>
        </div>
      )}
      {messages.map((m) => (
        <AIMessage key={m.id} message={m} onRetry={m.error ? () => onRetry(m.id) : undefined} />
      ))}
      {showTyping && <TypingIndicator />}
    </div>
  );
}
