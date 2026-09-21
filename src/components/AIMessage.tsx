import type { ChatMessage, ImageProvider } from "@/lib/nexa/chat-types";
import { providerLabel, type ProviderId } from "@/lib/nexa/models";

const PROVIDER_STYLES: Record<ImageProvider, string> = {
  openai: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  anthropic: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  google: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  groq: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  openrouter: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  pollinations: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
};

function providerBadgeLabel(provider: ImageProvider): string {
  return provider === "pollinations" ? "Pollinations (gratis)" : providerLabel(provider as ProviderId);
}

export function AIMessage({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex animate-[fadeInUp_0.25s_ease-out] ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
            : message.error
              ? "bg-red-50 text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60"
              : "bg-white text-neutral-900 ring-1 ring-neutral-100 dark:bg-neutral-800/80 dark:text-neutral-100 dark:ring-neutral-700/50"
        }`}
      >
        {!isUser && message.provider && (
          <span
            className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PROVIDER_STYLES[message.provider]}`}
            title={message.model}
          >
            {providerBadgeLabel(message.provider)}
          </span>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {message.attachments.map((a, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${a.name}-${i}`}
                src={`data:${a.mediaType};base64,${a.data}`}
                alt={a.name}
                className="h-24 w-24 rounded-lg object-cover ring-1 ring-white/30"
              />
            ))}
          </div>
        )}

        {message.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.image} alt="Imagen generada" className="max-w-full rounded-lg" />
        ) : (
          message.content || (message.role === "assistant" ? "…" : "")
        )}

        {message.error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/70"
          >
            ↻ Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
