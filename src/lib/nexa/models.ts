import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel, ToolSet } from "ai";

export type ProviderId = "openai" | "anthropic" | "google" | "groq" | "openrouter";
export type Tier = "fast" | "general" | "advanced";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

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
    // flash-latest y pro-latest devuelven 503 "high demand" / 429 "quota
    // exceeded" con bastante frecuencia en el tier gratuito; flash-lite es
    // el que responde de forma consistente, así que es el default más
    // confiable mientras solo haya un proveedor configurado.
    fast: process.env.GOOGLE_MODEL_FAST ?? "gemini-flash-lite-latest",
    general: process.env.GOOGLE_MODEL_GENERAL ?? "gemini-flash-lite-latest",
    advanced: process.env.GOOGLE_MODEL_ADVANCED ?? "gemini-flash-lite-latest",
  },
  groq: {
    // llama-3.1-8b-instant y llama-3.3-70b-versatile pasaron a ser
    // "Enterprise" en el catálogo de Groq (solo "Contact Sales", sin acceso
    // self-service) — devuelven 404 model_not_found en una cuenta normal.
    // Los modelos GPT-OSS sí están disponibles en cuenta estándar
    // (console.groq.com/docs/models, tabla "Production Models").
    fast: process.env.GROQ_MODEL_FAST ?? "openai/gpt-oss-20b",
    general: process.env.GROQ_MODEL_GENERAL ?? "openai/gpt-oss-120b",
    advanced: process.env.GROQ_MODEL_ADVANCED ?? "openai/gpt-oss-120b",
  },
  openrouter: {
    // meta-llama/llama-3.2-3b-instruct:free dejó de estar disponible gratis
    // (la propia API lo confirmó). Ambos slugs de abajo están verificados
    // 1:1 en sus páginas de detalle en openrouter.ai (precio $0 input y
    // output, buen uptime):
    // - inclusionai/ling-3.0-flash-vl:free — 62 tps, 2.25s latencia, 100% uptime
    // - nex-agi/nex-n2.5-pro:free — 46 tps, 1.42s latencia, 99.70% uptime
    fast: process.env.OPENROUTER_MODEL_FAST ?? "inclusionai/ling-3.0-flash-vl:free",
    general: process.env.OPENROUTER_MODEL_GENERAL ?? "nex-agi/nex-n2.5-pro:free",
    advanced: process.env.OPENROUTER_MODEL_ADVANCED ?? "nex-agi/nex-n2.5-pro:free",
  },
};

export const OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

const KEY_ENV_VAR: Record<ProviderId, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  groq: process.env.GROQ_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
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
    case "groq":
      return "Groq";
    case "openrouter":
      return "OpenRouter";
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
    case "groq":
      return groq(modelId);
    case "openrouter":
      return openrouter(modelId);
  }
}

export function modelIdFor(provider: ProviderId, tier: Tier): string {
  return MODEL_IDS[provider][tier];
}

/**
 * Herramientas de búsqueda web nativa por proveedor (ejecutadas del lado
 * del proveedor, no requieren un segundo round-trip). Google es el único
 * probado de verdad en este entorno (es el único con salida a internet
 * desde el sandbox de desarrollo); los demás quedan sin implementar hasta
 * poder verificarlos con una clave real, en vez de adivinar el nombre de
 * la tool y romper algo en producción.
 */
export function getSearchTools(provider: ProviderId): ToolSet | undefined {
  if (provider === "google") {
    return { google_search: google.tools.googleSearch({}) };
  }
  return undefined;
}

export { openai };
