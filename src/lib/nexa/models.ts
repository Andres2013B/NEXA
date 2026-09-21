import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type ProviderId = "openai" | "anthropic" | "google";
export type Tier = "fast" | "general" | "advanced";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * IDs de modelo configurables por variable de entorno para que el
 * despliegue pueda seguir el catálogo vigente de cada proveedor sin tocar
 * código. Los valores por defecto son modelos generales razonables en el
 * momento de escribir esto; revisa la documentación de cada proveedor antes
 * de desplegar a producción.
 */
const MODEL_IDS: Record<ProviderId, Record<Tier, string>> = {
  openai: {
    fast: process.env.OPENAI_MODEL_FAST ?? "gpt-4o-mini",
    general: process.env.OPENAI_MODEL_GENERAL ?? "gpt-4o",
    advanced: process.env.OPENAI_MODEL_ADVANCED ?? "gpt-4.1",
  },
  anthropic: {
    fast: process.env.ANTHROPIC_MODEL_FAST ?? "claude-3-5-haiku-latest",
    general: process.env.ANTHROPIC_MODEL_GENERAL ?? "claude-sonnet-4-5",
    advanced: process.env.ANTHROPIC_MODEL_ADVANCED ?? "claude-opus-4-1",
  },
  google: {
    fast: process.env.GOOGLE_MODEL_FAST ?? "gemini-2.0-flash",
    general: process.env.GOOGLE_MODEL_GENERAL ?? "gemini-2.0-flash",
    advanced: process.env.GOOGLE_MODEL_ADVANCED ?? "gemini-1.5-pro",
  },
};

export const OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

const KEY_ENV_VAR: Record<ProviderId, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
};

export function isProviderConfigured(provider: ProviderId): boolean {
  return Boolean(KEY_ENV_VAR[provider]);
}

export function providerLabel(provider: ProviderId): string {
  switch (provider) {
    case "openai":
      return "ChatGPT (OpenAI)";
    case "anthropic":
      return "Claude (Anthropic)";
    case "google":
      return "Gemini (Google)";
  }
}

export function resolveModel(provider: ProviderId, tier: Tier): LanguageModel {
  const modelId = MODEL_IDS[provider][tier];
  switch (provider) {
    case "openai":
      return openai(modelId);
    case "anthropic":
      return anthropic(modelId);
    case "google":
      return google(modelId);
  }
}

export function modelIdFor(provider: ProviderId, tier: Tier): string {
  return MODEL_IDS[provider][tier];
}

export { openai };
