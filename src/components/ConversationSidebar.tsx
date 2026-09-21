"use client";

import type { Conversation } from "@/lib/nexa/chat-types";

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-neutral-50/70 dark:bg-neutral-900/40 sm:w-64 sm:shrink-0 sm:border-r sm:border-neutral-100 sm:dark:border-neutral-800">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-transform active:scale-95"
        >
          <span aria-hidden>+</span> Nuevo chat
        </button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-neutral-400 dark:text-neutral-600">
            Sin conversaciones todavía
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg text-sm transition-colors ${
              c.id === activeId
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                : "text-neutral-500 hover:bg-white/70 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="min-w-0 flex-1 truncate px-2.5 py-2.5 text-left"
              title={c.title}
            >
              {c.title}
            </button>
            <button
              type="button"
              onClick={() => onDelete(c.id)}
              aria-label={`Eliminar conversación "${c.title}"`}
              className="mr-1 shrink-0 rounded-md p-1.5 text-neutral-400 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-red-900/40 dark:hover:text-red-300"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
