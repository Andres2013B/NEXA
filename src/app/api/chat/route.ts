import { generateText, streamText, type ModelMessage } from "ai";
import { NEXA_SYSTEM_PROMPT } from "@/lib/nexa/system-prompt";
import { route, type ForcedProvider } from "@/lib/nexa/router";
import {
  isProviderConfigured,
  modelIdFor,
  providerLabel,
  resolveModel,
  type ProviderId,
  type Tier,
} from "@/lib/nexa/models";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tiempo máximo que se le da a cada proveedor en el modo "consultar a
// todos": el plan Hobby de Vercel mata la función entera a los 10s, así que
// hay que dejar margen para la síntesis final. Si esto empieza a cortarse
// seguido en producción, el problema es este límite (o el plan de Vercel),
// no el código.
const ENSEMBLE_PROVIDER_TIMEOUT_MS = 7_000;

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
async function attempt(provider: ProviderId, tier: Tier, messages: ModelMessage[]) {
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

interface EnsembleAnswer {
  provider: ProviderId;
  text: string;
}

async function queryOne(provider: ProviderId, tier: Tier, messages: ModelMessage[]): Promise<EnsembleAnswer> {
  const model = resolveModel(provider, tier);
  const { text } = await generateText({
    model,
    system: NEXA_SYSTEM_PROMPT,
    messages,
    abortSignal: AbortSignal.timeout(ENSEMBLE_PROVIDER_TIMEOUT_MS),
  });
  return { provider, text };
}

/** Le pregunta lo mismo a todos los proveedores configurados, en paralelo. */
async function gatherAnswers(chain: ProviderId[], tier: Tier, messages: ModelMessage[]) {
  const settled = await Promise.allSettled(chain.map((p) => queryOne(p, tier, messages)));
  const answers: EnsembleAnswer[] = [];
  const errors: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      answers.push(result.value);
    } else {
      const reason = result.reason;
      console.error(`[nexa/chat] ${chain[i]} falló en el ensemble:`, reason);
      errors.push(`${providerLabel(chain[i])}: ${reason instanceof Error ? reason.message : "error desconocido"}.`);
    }
  });
  // Mantiene el orden de preferencia de la cadena (google primero, etc.).
  answers.sort((a, b) => chain.indexOf(a.provider) - chain.indexOf(b.provider));
  return { answers, errors };
}

function buildSynthesisMessages(messages: ModelMessage[], userText: string, answers: EnsembleAnswer[]): ModelMessage[] {
  const combined = answers
    .map((a) => `[${providerLabel(a.provider)}]\n${a.text}`)
    .join("\n\n---\n\n");
  const synthesisPrompt = `Pregunta del usuario:\n${userText}\n\nEstas son las respuestas de distintos modelos de IA a la misma pregunta:\n\n${combined}\n\nSintetizá todo esto en UNA sola respuesta final para el usuario, tomando lo mejor de cada una (precisión, completitud, claridad) y descartando lo redundante o contradictorio. Respondé directo, en tu propia voz como NEXA, sin mencionar que consultaste otros modelos ni citarlos por nombre.`;
  return [...messages.slice(0, -1), { role: "user", content: synthesisPrompt }];
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

  // Modo "consultar a todos": solo tiene sentido en modo automático (si el
  // usuario fuerza un proveedor puntual, quiere ESE, no una mezcla) y con
  // dos o más proveedores configurados. Con uno solo (el caso de hoy, con
  // solo Gemini activo) se comporta exactamente igual que antes.
  if (mode === "auto" && configuredChain.length >= 2) {
    const { answers, errors: gatherErrors } = await gatherAnswers(configuredChain, decision.tier, messages);
    errors.push(...gatherErrors);

    if (answers.length > 0) {
      const synthesizer = answers[0].provider;
      const encoder = new TextEncoder();

      try {
        if (answers.length === 1) {
          // Un solo proveedor respondió a tiempo: no hay nada que
          // sintetizar, se manda tal cual.
          const bytes = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(answers[0].text));
              controller.close();
            },
          });
          return new Response(bytes, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Nexa-Provider": synthesizer,
              "X-Nexa-Model": modelIdFor(synthesizer, decision.tier),
              "X-Nexa-Category": decision.category,
              "X-Nexa-Sources": answers.map((a) => a.provider).join(","),
            },
          });
        }

        const synthesisMessages = buildSynthesisMessages(messages, lastUserText, answers);
        const { reader, first } = await attempt(synthesizer, decision.tier, synthesisMessages);

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
              // Se cortó a mitad de la síntesis; cerramos con lo ya enviado.
            } finally {
              controller.close();
            }
          },
        });

        return new Response(bytes, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Nexa-Provider": synthesizer,
            "X-Nexa-Model": modelIdFor(synthesizer, decision.tier),
            "X-Nexa-Category": decision.category,
            "X-Nexa-Sources": answers.map((a) => a.provider).join(","),
          },
        });
      } catch (err) {
        // La síntesis falló pero ya tenemos al menos una respuesta cruda:
        // mandamos la mejor (la de mayor prioridad) en vez de un error duro.
        console.error("[nexa/chat] síntesis falló, devolviendo mejor respuesta cruda:", err);
        const best = answers[0];
        return new Response(best.text, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Nexa-Provider": best.provider,
            "X-Nexa-Model": modelIdFor(best.provider, decision.tier),
            "X-Nexa-Category": decision.category,
            "X-Nexa-Sources": best.provider,
          },
        });
      }
    }
    // Si nadie respondió, cae al camino de error de abajo con los detalles
    // ya acumulados en `errors`.
  } else {
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
