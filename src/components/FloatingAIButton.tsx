"use client";

export function FloatingAIButton({
  open,
  onClick,
  messageCount,
}: {
  open: boolean;
  onClick: () => void;
  messageCount: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Cerrar asistente NEXA" : "Abrir asistente NEXA"}
      aria-expanded={open}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 animate-[popIn_0.3s_ease-out] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-2xl text-white shadow-lg shadow-violet-600/30 transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
    >
      <span className={`inline-block transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
        {open ? "✕" : "✦"}
      </span>
      {!open && messageCount === 0 && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500 ring-2 ring-white dark:ring-neutral-950" />
        </span>
      )}
    </button>
  );
}
