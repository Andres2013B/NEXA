import type { ChatMessage } from "@/lib/nexa/chat-types";
import { ModelBadge } from "./ModelBadge";

export function ChatMessageView({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            : message.error
              ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
              : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        }`}
      >
        {!isUser && message.provider && (
          <div className="mb-1.5">
            <ModelBadge provider={message.provider} model={message.model} />
          </div>
        )}
        {message.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.image}
            alt="Imagen generada"
            className="rounded-lg max-w-full"
          />
        ) : (
          message.content || (message.role === "assistant" ? "…" : "")
        )}
      </div>
    </div>
  );
}
