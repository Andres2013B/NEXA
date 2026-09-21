"use client";

import { useState } from "react";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import { AIChatPanel } from "@/components/AIChatPanel";
import { useNexaChat } from "@/lib/nexa/useNexaChat";

const SUGGESTIONS = [
  "Escribe un correo profesional",
  "Explícame un tema paso a paso",
  "Ayúdame con un problema de matemáticas",
  "Genera código para una función",
];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const { messages, mode, setMode, isLoading, send, retry } = useNexaChat();

  function openWith(text?: string) {
    setOpen(true);
    if (text) send(text, false);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(124,58,237,0.15),transparent_45%),radial-gradient(circle_at_100%_10%,rgba(79,70,229,0.12),transparent_40%)]"
      />

      <main className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-3xl text-white shadow-lg shadow-violet-600/20">
          ✦
        </span>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            NEXA
          </h1>
          <p className="mx-auto max-w-md text-sm text-neutral-500 dark:text-neutral-400 sm:text-base">
            IA multimodelo — combina ChatGPT, Claude y Gemini, y elige el mejor
            modelo automáticamente para cada tarea.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openWith()}
          className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-transform hover:scale-[1.02] active:scale-95"
        >
          Iniciar conversación
        </button>

        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => openWith(s)}
              className="rounded-full border border-neutral-200 bg-white/70 px-3.5 py-1.5 text-xs text-neutral-600 backdrop-blur transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
            >
              {s}
            </button>
          ))}
        </div>
      </main>

      <FloatingAIButton
        open={open}
        onClick={() => setOpen((v) => !v)}
        messageCount={messages.length}
      />
      <AIChatPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        mode={mode}
        onModeChange={setMode}
        isLoading={isLoading}
        isImageMode={isImageMode}
        onToggleImageMode={() => setIsImageMode((v) => !v)}
        onSend={(text) => send(text, isImageMode)}
        onRetry={retry}
      />
    </div>
  );
}
