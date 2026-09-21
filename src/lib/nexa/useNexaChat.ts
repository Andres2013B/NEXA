"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment, ChatMessage, Conversation } from "./chat-types";
import type { ProviderId } from "./models";

const STORAGE_KEY = "nexa:conversations";
const TITLE_MAX_LENGTH = 42;

function id() {
  return Math.random().toString(36).slice(2);
}

function titleFrom(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed || "Nueva conversación";
  return `${trimmed.slice(0, TITLE_MAX_LENGTH)}…`;
}

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Convierte un ChatMessage a la forma que espera /api/chat (texto o texto+imágenes). */
function toWireMessage(m: ChatMessage) {
  if (!m.attachments?.length) {
    return { role: m.role, content: m.content };
  }
  return {
    role: m.role,
    content: [
      { type: "text" as const, text: m.content },
      ...m.attachments.map((a) => ({
        type: "file" as const,
        data: a.data,
        mediaType: a.mediaType,
        filename: a.name,
      })),
    ],
  };
}

export function useNexaChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hydrated = useRef(false);

  // localStorage no existe en el server: el estado arranca vacío para que el
  // render inicial coincida con el SSR, y recién acá (post-mount) se hidrata
  // con lo guardado. No es un caso de "derivar estado de props".
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    setActiveId(stored[0]?.id ?? null);
    hydrated.current = true;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // localStorage puede fallar (modo privado, cuota llena); no es crítico.
    }
  }, [conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  function newConversation(): string {
    const conv: Conversation = {
      id: id(),
      title: "Nueva conversación",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }

  function selectConversation(convId: string) {
    setActiveId(convId);
  }

  function deleteConversation(convId: string) {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    setActiveId((prev) => (prev === convId ? null : prev));
  }

  function patchConversation(convId: string, patch: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === convId ? patch(c) : c)));
  }

  function ensureActiveConversation(): string {
    if (activeId) return activeId;
    return newConversation();
  }

  async function runChat(convId: string, history: ChatMessage[], text: string, attachments: Attachment[]) {
    const userMessage: ChatMessage = {
      id: id(),
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const assistantId = id();
    const withUser = [...history, userMessage];
    const isFirstMessage = history.length === 0;

    patchConversation(convId, (c) => ({
      ...c,
      title: isFirstMessage ? titleFrom(text || "Imagen adjunta") : c.title,
      messages: [...withUser, { id: assistantId, role: "assistant", content: "", kind: "chat" }],
      updatedAt: Date.now(),
    }));
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "auto",
          messages: withUser.map(toWireMessage),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const details = Array.isArray(data.details) ? data.details.join(" ") : undefined;
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
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
        }));
        return;
      }

      const provider = res.headers.get("X-Nexa-Provider") as ProviderId | null;
      const model = res.headers.get("X-Nexa-Model") ?? undefined;
      const sourcesHeader = res.headers.get("X-Nexa-Sources");
      const sources = sourcesHeader ? (sourcesHeader.split(",") as ProviderId[]) : undefined;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId
              ? { ...m, content, provider: provider ?? undefined, model, sources }
              : m,
          ),
        }));
      }
    } catch {
      patchConversation(convId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? { ...m, error: true, content: "No pude completar la solicitud. Inténtalo nuevamente." }
            : m,
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function runImage(convId: string, history: ChatMessage[], prompt: string) {
    const userMessage: ChatMessage = { id: id(), role: "user", content: prompt };
    const assistantId = id();
    const isFirstMessage = history.length === 0;

    patchConversation(convId, (c) => ({
      ...c,
      title: isFirstMessage ? titleFrom(prompt) : c.title,
      messages: [
        ...history,
        userMessage,
        { id: assistantId, role: "assistant", content: "Generando imagen…", kind: "image" },
      ],
      updatedAt: Date.now(),
    }));
    setIsLoading(true);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  error: true,
                  content: data.error ?? "No pude completar la solicitud. Inténtalo nuevamente.",
                }
              : m,
          ),
        }));
        return;
      }

      patchConversation(convId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content: "", image: data.image, provider: data.provider ?? "pollinations" }
            : m,
        ),
      }));
    } catch {
      patchConversation(convId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? { ...m, error: true, content: "No pude completar la solicitud. Inténtalo nuevamente." }
            : m,
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  }

  function send(text: string, isImageMode: boolean, attachments: Attachment[] = []) {
    const convId = ensureActiveConversation();
    const history = conversations.find((c) => c.id === convId)?.messages ?? [];
    if (isImageMode) void runImage(convId, history, text);
    else void runChat(convId, history, text, attachments);
  }

  function retry(assistantId: string) {
    if (!active) return;
    const idx = active.messages.findIndex((m) => m.id === assistantId);
    if (idx < 1) return;
    const failed = active.messages[idx];
    const prevUser = active.messages[idx - 1];
    if (prevUser?.role !== "user") return;

    const base = active.messages.slice(0, idx - 1);
    if (failed.kind === "image") void runImage(active.id, base, prevUser.content);
    else void runChat(active.id, base, prevUser.content, prevUser.attachments ?? []);
  }

  return {
    conversations,
    activeId,
    messages,
    isLoading,
    send,
    retry,
    newConversation,
    selectConversation,
    deleteConversation,
  };
}
