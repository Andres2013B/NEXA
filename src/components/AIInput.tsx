"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log|ya?ml|xml|html?|css|js|jsx|ts|tsx|py|java|c|cpp|go|rs|sql)$/i;

interface AIInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isImageMode: boolean;
  onToggleImageMode: () => void;
}

export function AIInput({ onSend, isLoading, isImageMode, onToggleImageMode }: AIInputProps) {
  const [value, setValue] = useState("");
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text || isLoading) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("text/") && !TEXT_EXTENSIONS.test(file.name)) {
      setAttachError(
        `"${file.name}" no es un archivo de texto plano. Por ahora NEXA solo puede leer directamente archivos .txt, .md, .csv, .json y código fuente.`,
      );
      return;
    }

    setAttachError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setValue((prev) =>
        `${prev ? prev + "\n\n" : ""}Contenido de "${file.name}":\n\`\`\`\n${content.slice(0, 12000)}\n\`\`\`\n`,
      );
      requestAnimationFrame(resizeTextarea);
    };
    reader.readAsText(file);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-neutral-100 p-3 dark:border-neutral-800">
      {attachError && (
        <p className="px-1 text-xs text-amber-600 dark:text-amber-400">{attachError}</p>
      )}
      <div className="flex items-end gap-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-1.5 transition-colors focus-within:border-violet-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:focus-within:border-violet-600">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar archivo de texto"
          aria-label="Adjuntar archivo de texto"
          className="shrink-0 rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:bg-neutral-700/70"
        >
          📎
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={onToggleImageMode}
          title="Generar imagen"
          aria-label="Alternar modo generar imagen"
          aria-pressed={isImageMode}
          className={`shrink-0 rounded-full p-2 transition-colors ${
            isImageMode
              ? "bg-violet-600 text-white"
              : "text-neutral-500 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:bg-neutral-700/70"
          }`}
        >
          🖼️
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Mensaje para NEXA"
          placeholder={isImageMode ? "Describe la imagen que quieres crear…" : "Pregúntame lo que quieras…"}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          aria-label="Enviar mensaje"
          className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          ) : (
            "Enviar"
          )}
        </button>
      </div>
    </form>
  );
}
