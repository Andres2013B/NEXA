"use client";

import { useEffect } from "react";
import type { ChatMessage, ModelMode } from "@/lib/nexa/chat-types";
import { AIChatHeader } from "./AIChatHeader";
import { AIMessageList } from "./AIMessageList";
import { AIInput } from "./AIInput";

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  mode: ModelMode;
  onModeChange: (mode: ModelMode) => void;
  isLoading: boolean;
  isImageMode: boolean;
  onToggleImageMode: () => void;
  onSend: (text: string) => void;
  onRetry: (assistantId: string) => void;
}

export function AIChatPanel({
  open,
  onClose,
  messages,
  mode,
  onModeChange,
  isLoading,
  isImageMode,
  onToggleImageMode,
  onSend,
  onRetry,
}: AIChatPanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-end sm:bottom-24 sm:right-6 sm:inset-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Asistente NEXA"
        className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 animate-[slideUp_0.25s_ease-out] dark:bg-neutral-900 dark:ring-white/10 sm:h-[min(680px,calc(100dvh-7rem))] sm:w-[400px] sm:rounded-3xl"
      >
        <AIChatHeader mode={mode} onModeChange={onModeChange} onClose={onClose} />
        <AIMessageList messages={messages} isLoading={isLoading} onRetry={onRetry} />
        <AIInput
          onSend={onSend}
          isLoading={isLoading}
          isImageMode={isImageMode}
          onToggleImageMode={onToggleImageMode}
        />
      </div>
    </div>
  );
}
