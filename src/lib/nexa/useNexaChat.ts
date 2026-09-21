"use client";

import { useState } from "react";
import type { ChatMessage, ModelMode } from "./chat-types";
import type { ProviderId } from "./models";

function id() {
  return Math.random().toString(36).slice(2);
}

export function useNexaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ModelMode>("auto");
  const [isLoading, setIsLoading] = useState(false);

  async function runChat(history: ChatMessage[], text: string) {
    const userMessage: ChatMessage = { id: id(), role: "user", content: text };
    const assistantId = id();
    const withUser = [...history, userMessage];

    setMessages([...withUser, { id: assistantId, role: "assistant", content: "", kind: "chat" }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: withUser.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const details = Array.isArray(data.details) ? data.details.join(" ") : undefined;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  error: true,
                  content: [
                    data.error ?? "No pude completar la solicitud. Inténtalo nuevamente.",
                    details,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                }
              : m,
          ),
        );
        return;
      }

      const provider = res.headers.get("X-Nexa-Provider") as ProviderId | null;
      const model = res.headers.get("X-Nexa-Model") ?? undefined;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content, provider: provider ?? undefined, model }
              : m,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, error: true, content: "No pude completar la solicitud. Inténtalo nuevamente." }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function runImage(history: ChatMessage[], prompt: string) {
    const userMessage: ChatMessage = { id: id(), role: "user", content: prompt };
    const assistantId = id();

    setMessages([
      ...history,
      userMessage,
      { id: assistantId, role: "assistant", content: "Generando imagen…", kind: "image" },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  error: true,
                  content: data.error ?? "No pude completar la solicitud. Inténtalo nuevamente.",
                }
              : m,
          ),
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "", image: data.image, provider: "openai" }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, error: true, content: "No pude completar la solicitud. Inténtalo nuevamente." }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  function send(text: string, isImageMode: boolean) {
    if (isImageMode) void runImage(messages, text);
    else void runChat(messages, text);
  }

  function retry(assistantId: string) {
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx < 1) return;
    const failed = messages[idx];
    const prevUser = messages[idx - 1];
    if (prevUser?.role !== "user") return;

    const base = messages.slice(0, idx - 1);
    if (failed.kind === "image") void runImage(base, prevUser.content);
    else void runChat(base, prevUser.content);
  }

  return { messages, mode, setMode, isLoading, send, retry };
}
