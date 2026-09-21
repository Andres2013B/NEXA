"use client";

import { useRef, useState, type FormEvent } from "react";

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log|ya?ml|xml|html?|css|js|jsx|ts|tsx|py|java|c|cpp|go|rs|sql)$/i;

interface ComposerProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isImageMode: boolean;
  onToggleImageMode: () => void;
}

export function Composer({
  onSend,
  isLoading,
  isImageMode,
  onToggleImageMode,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || isLoading) return;
    onSend(text);
    setValue("");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
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
    };
    reader.readAsText(file);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {attachError && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{attachError}</p>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar archivo de texto"
          className="shrink-0 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={onToggleImageMode}
          title="Generar imagen"
          className={`shrink-0 rounded-full p-2 ${
            isImageMode
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          🖼️
        </button>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          placeholder={
            isImageMode
              ? "Describe la imagen que quieres crear…"
              : "Escribe tu mensaje para NEXA…"
          }
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          {isLoading ? "…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
