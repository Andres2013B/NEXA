import type { ChatMessage, ImageProvider } from "@/lib/nexa/chat-types";
import { providerLabel, type ProviderId } from "@/lib/nexa/models";

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
            className="mb-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[10px] text-white"
            title={
              message.sources && message.sources.length > 1
                ? `Combinado: ${message.sources.map((s) => providerLabel(s)).join(", ")}`
                : providerBadgeLabel(message.provider)
            }
          >
            ✦
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

        {!isUser && message.warnings && message.warnings.length > 0 && (
          <details className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
            <summary className="cursor-pointer select-none">
              ⚠ {message.warnings.length === 1 ? "1 proveedor no respondió" : `${message.warnings.length} proveedores no respondieron`}
            </summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-neutral-500 dark:text-neutral-400">
              {message.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
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
