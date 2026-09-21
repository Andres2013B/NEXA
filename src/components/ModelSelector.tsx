"use client";

import { useEffect, useState } from "react";
import type { ModelMode } from "@/lib/nexa/chat-types";

const OPTIONS: { value: ModelMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "google", label: "Gemini" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "ChatGPT" },
  { value: "anthropic", label: "Claude" },
];

export function ModelSelector({
  value,
  onChange,
}: {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
}) {
  const [configured, setConfigured] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then(setConfigured)
      .catch(() => {});
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Modelo de IA"
      className="flex flex-wrap items-center gap-0.5 rounded-2xl bg-neutral-100 p-1 text-xs dark:bg-white/5"
    >
      {OPTIONS.map((opt) => {
        const locked = opt.value !== "auto" && configured[opt.value] === false;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={locked}
            title={locked ? `${opt.label} requiere una API key configurada` : undefined}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-2.5 py-1 font-medium transition-all duration-150 ${
              active
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white"
                : locked
                  ? "cursor-not-allowed text-neutral-300 dark:text-neutral-700"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {opt.label}
            {locked && <span aria-hidden className="ml-0.5">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
