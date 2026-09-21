"use client";

import type { ModelMode } from "@/lib/nexa/chat-types";
import { ModelSelector } from "./ModelSelector";

export function AIChatHeader({
  mode,
  onModeChange,
  onClose,
}: {
  mode: ModelMode;
  onModeChange: (mode: ModelMode) => void;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-base text-white shadow-sm">
            ✦
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">NEXA AI</h2>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="En línea" />
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">¿En qué puedo ayudarte?</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar chat"
          className="shrink-0 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          ✕
        </button>
      </div>
      <div className="flex justify-end px-4 pb-3 pt-2">
        <ModelSelector value={mode} onChange={onModeChange} />
      </div>
    </div>
  );
}
