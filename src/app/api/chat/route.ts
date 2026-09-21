import { streamText, type ModelMessage } from "ai";
import { NEXA_SYSTEM_PROMPT } from "@/lib/nexa/system-prompt";
import { route, type ForcedProvider } from "@/lib/nexa/router";
import {
  isProviderConfigured,
  modelIdFor,
  providerLabel,
  resolveModel,
  type ProviderId,
} from "@/lib/nexa/models";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  messages: ModelMessage[];
  mode?: ForcedProvider;
}

/**
 * Intenta iniciar el stream con un proveedor. Lee el primer chunk para
 * detectar errores de autenticación/config antes de comprometernos a
 * responder con este proveedor, y así poder pasar al siguiente de la
 * cadena de respaldo (sección 27 del sistema NEXA).
 */
async function attempt(provider: ProviderId, tier: ReturnType<typeof route>["tier"], messages: ModelMessage[]) {
  const model = resolveModel(provider, tier);
  let streamError: unknown;
  const result = streamText({
    model,
    system: NEXA_SYSTEM_PROMPT,
    messages,
    // Cuando falla la llamada al proveedor (ej. 503 "high demand") antes de
    // emitir contenido, textStream termina vacío en vez de rechazar la
    // promesa de lectura; capturamos el error acá para poder detectarlo y
    // pasar al siguiente proveedor de la cadena en vez de responder 200 con
    // el cuerpo vacío.
    onError: ({ error }) => {
      streamError = error;
    },
  });
  const reader = result.textStream.getReader();
  const first = await reader.read();
  if (first.done && !first.value && streamError) {
    throw streamError;
  }
  return { reader, first };
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequestBody;
  const { messages, mode = "auto" } = body;

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "No se recibieron mensajes." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  // El contenido puede venir como array (texto + imágenes adjuntas); para
  // clasificar la categoría solo nos importa la parte de texto.
  const lastUserText =
    typeof lastUserMessage === "string"
      ? lastUserMessage
      : lastUserMessage
          .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
          .map((part) => part.text)
          .join(" ");

  const decision = route(lastUserText, mode);

  const configuredChain = decision.chain.filter(isProviderConfigured);
  const chainToTry = configuredChain.length > 0 ? configuredChain : decision.chain;

  const errors: string[] = [];

  for (const provider of chainToTry) {
    if (!isProviderConfigured(provider)) {
      errors.push(`${providerLabel(provider)}: falta la clave de API.`);
      continue;
    }
    try {
      const { reader, first } = await attempt(provider, decision.tier, messages);
      const encoder = new TextEncoder();

      const bytes = new ReadableStream<Uint8Array>({
        async start(controller) {
          if (!first.done && first.value) {
            controller.enqueue(encoder.encode(first.value));
          }
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(encoder.encode(value));
            }
          } catch {
            // El proveedor falló a media transmisión; cerramos con lo ya enviado.
          } finally {
            controller.close();
          }
        },
      });

      return new Response(bytes, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Nexa-Provider": provider,
          "X-Nexa-Model": modelIdFor(provider, decision.tier),
          "X-Nexa-Category": decision.category,
          "X-Nexa-Reason": encodeURIComponent(decision.reason),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "error desconocido";
      console.error(`[nexa/chat] ${provider} falló:`, err);
      errors.push(`${providerLabel(provider)}: ${message}.`);
    }
  }

  return new Response(
    JSON.stringify({
      error:
        "No se pudo obtener respuesta de ningún modelo disponible. Verifica las claves de API configuradas.",
      details: errors,
    }),
    { status: 502, headers: { "Content-Type": "application/json" } },
  );
}
