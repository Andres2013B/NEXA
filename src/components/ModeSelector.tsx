import type { ModelMode } from "@/lib/nexa/chat-types";

const OPTIONS: { value: ModelMode; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "openai", label: "ChatGPT" },
  { value: "anthropic", label: "Claude" },
  { value: "google", label: "Gemini" },
];

export function ModeSelector({
  value,
  onChange,
}: {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1 text-xs dark:bg-neutral-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === opt.value
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
