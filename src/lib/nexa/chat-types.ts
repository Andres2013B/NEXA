import type { ProviderId } from "./models";

export type ChatRole = "user" | "assistant";

/** "pollinations" solo aparece en imágenes: no es un proveedor de chat. */
export type ImageProvider = ProviderId | "pollinations";

/** Un archivo (imagen o texto) que el usuario adjuntó a su mensaje. */
export interface Attachment {
  name: string;
  mediaType: string;
  /** Base64 sin el prefijo "data:...;base64,". */
  data: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  provider?: ImageProvider;
  model?: string;
  category?: string;
  /** Proveedores que contribuyeron a esta respuesta en modo "consultar a todos". */
  sources?: ProviderId[];
  /** Proveedores que fallaron en el intento "consultar a todos" (aunque la respuesta haya salido bien). */
  warnings?: string[];
  error?: boolean;
  /** Imagen generada (resultado del modo "generar imagen"). */
  image?: string;
  /** Imágenes/archivos que el usuario subió como contexto de este mensaje. */
  attachments?: Attachment[];
  /** Qué endpoint originó este turno, para poder reintentarlo correctamente. */
  kind?: "chat" | "image";
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export type ModelMode = ProviderId | "auto";
