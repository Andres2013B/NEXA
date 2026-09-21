export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-2 px-1 py-1 text-xs text-neutral-400 dark:text-neutral-500"
      aria-live="polite"
    >
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
      </span>
      NEXA está pensando…
    </div>
  );
}
