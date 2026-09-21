import type { ProviderId } from "./models";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  provider?: ProviderId;
  model?: string;
  category?: string;
  error?: boolean;
  image?: string;
}

export type ModelMode = ProviderId | "auto";
