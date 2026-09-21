"use client";

import { useEffect, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { ChatMessageView } from "@/components/ChatMessageView";
import { ModeSelector } from "@/components/ModeSelector";
import type { ChatMessage, ModelMode } from "@/lib/nexa/chat-types";
import type { ProviderId } from "@/lib/nexa/models";

function id() {
  return Math.random().toString(36).slice(2);
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ModelMode>("auto");
  const [isImageMode, setIsImageMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function sendChat(text: string) {
    const userMessage: ChatMessage = { id: id(), role: "user", content: text };
    const assistantId = id();
    const history = [...messages, userMessage];

    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  error: true,
                  content:
                    data.error ??
                    "No se pudo obtener respuesta. Verifica la configuración de las claves de API.",
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
            ? { ...m, error: true, content: "Error de red al contactar a NEXA." }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function sendImage(prompt: string) {
    const userMessage: ChatMessage = { id: id(), role: "user", content: prompt };
    const assistantId = id();
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "Generando imagen…" },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, error: true, content: data.error ?? "No se pudo generar la imagen." }
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
            ? { ...m, error: true, content: "Error de red al generar la imagen." }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSend(text: string) {
    if (isImageMode) {
      void sendImage(text);
    } else {
      void sendChat(text);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-4">
        <div>
          <h1 className="text-lg font-semibold">NEXA</h1>
          <p className="text-xs text-neutral-500">
            IA multimodelo — elige el mejor modelo automáticamente para cada tarea
          </p>
        </div>
        <ModeSelector value={mode} onChange={setMode} />
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-neutral-400">
            <p className="text-2xl">👋</p>
            <p className="text-sm">
              Pregúntame algo, pide un documento, código, una comparación o toca
              🖼️ para generar una imagen.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessageView key={m.id} message={m} />
        ))}
      </div>

      <div className="pb-4">
        <Composer
          onSend={handleSend}
          isLoading={isLoading}
          isImageMode={isImageMode}
          onToggleImageMode={() => setIsImageMode((v) => !v)}
        />
      </div>
    </div>
  );
}
