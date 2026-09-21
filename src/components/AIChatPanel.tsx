"use client";

import { useEffect, useState } from "react";
import type { Attachment, ChatMessage, Conversation } from "@/lib/nexa/chat-types";
import { AIChatHeader } from "./AIChatHeader";
import { AIMessageList } from "./AIMessageList";
import { AIInput } from "./AIInput";
import { ConversationSidebar } from "./ConversationSidebar";

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  isImageMode: boolean;
  onToggleImageMode: () => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onRetry: (assistantId: string) => void;
}

export function AIChatPanel({
  open,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  messages,
  isLoading,
  isImageMode,
  onToggleImageMode,
  onSend,
  onRetry,
}: AIChatPanelProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (sidebarOpen) setSidebarOpen(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, sidebarOpen, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Asistente NEXA"
      className="fixed inset-0 z-50 flex animate-[fadeInUp_0.2s_ease-out] bg-white dark:bg-neutral-900"
    >
      {/* Sidebar: fija en desktop, drawer superpuesto en mobile */}
      <div className="hidden sm:block sm:h-full">
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={onSelectConversation}
          onNew={onNewConversation}
          onDelete={onDeleteConversation}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-10 sm:hidden">
          <button
            type="button"
            aria-label="Cerrar lista de conversaciones"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/30 animate-[fadeInUp_0.15s_ease-out]"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl animate-[slideUp_0.2s_ease-out]">
            <ConversationSidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={(id) => {
                onSelectConversation(id);
                setSidebarOpen(false);
              }}
              onNew={() => {
                onNewConversation();
                setSidebarOpen(false);
              }}
              onDelete={onDeleteConversation}
            />
          </div>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <AIChatHeader onClose={onClose} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
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
