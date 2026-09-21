"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import type { Attachment } from "@/lib/nexa/chat-types";

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log|ya?ml|xml|html?|css|js|jsx|ts|tsx|py|java|c|cpp|go|rs|sql)$/i;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

interface AIInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  isImageMode: boolean;
  onToggleImageMode: () => void;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AIInput({ onSend, isLoading, isImageMode, onToggleImageMode }: AIInputProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
    if ((!text && attachments.length === 0) || isLoading) return;
    onSend(text, attachments);
    setValue("");
    setAttachments([]);
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

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setAttachError(null);

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_BYTES) {
          setAttachError(`"${file.name}" pesa demasiado (máx. 4MB por imagen).`);
          continue;
        }
        try {
          const dataUrl = await readAsDataUrl(file);
          const data = dataUrl.split(",")[1] ?? "";
          setAttachments((prev) => [
            ...prev,
            { name: file.name, mediaType: file.type || "image/png", data },
          ]);
        } catch {
          setAttachError(`No se pudo leer "${file.name}".`);
        }
        continue;
      }

      if (file.type.startsWith("text/") || TEXT_EXTENSIONS.test(file.name)) {
        try {
          const content = await readAsText(file);
          setValue((prev) =>
            `${prev ? prev + "\n\n" : ""}Contenido de "${file.name}":\n\`\`\`\n${content.slice(0, 12000)}\n\`\`\`\n`,
          );
          requestAnimationFrame(resizeTextarea);
        } catch {
          setAttachError(`No se pudo leer "${file.name}".`);
        }
        continue;
      }

      setAttachError(
        `"${file.name}" no es una imagen ni un archivo de texto plano. NEXA puede leer imágenes (.png, .jpg, .webp…) y texto (.txt, .md, .csv, .json, código fuente).`,
      );
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-neutral-100 p-3 dark:border-neutral-800">
      {attachError && (
        <p className="px-1 text-xs text-amber-600 dark:text-amber-400">{attachError}</p>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((a, i) => (
            <div key={`${a.name}-${i}`} className="group relative h-14 w-14 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${a.mediaType};base64,${a.data}`}
                alt={a.name}
                className="h-14 w-14 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
              />
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                aria-label={`Quitar ${a.name}`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white shadow-sm transition-transform hover:scale-110 dark:bg-white dark:text-neutral-900"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-1.5 transition-colors focus-within:border-violet-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:focus-within:border-violet-600">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar imagen o archivo de texto"
          aria-label="Adjuntar imagen o archivo de texto"
          className="shrink-0 rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:bg-neutral-700/70"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.txt,.md,.csv,.json,.log,.yml,.yaml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.go,.rs,.sql,text/*"
          className="hidden"
          onChange={handleFiles}
        />
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
          disabled={isLoading || (!value.trim() && attachments.length === 0)}
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
