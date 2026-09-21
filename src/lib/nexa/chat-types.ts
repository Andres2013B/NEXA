import type { ProviderId } from "./models";

export type ChatRole = "user" | "assistant";

/** "pollinations" solo aparece en imágenes: no es un proveedor de chat. */
export type ImageProvider = ProviderId | "pollinations";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  provider?: ImageProvider;
  model?: string;
  category?: string;
  error?: boolean;
  image?: string;
  /** Qué endpoint originó este turno, para poder reintentarlo correctamente. */
  kind?: "chat" | "image";
}

export type ModelMode = ProviderId | "auto";
