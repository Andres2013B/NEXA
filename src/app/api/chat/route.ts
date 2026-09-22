import { generateText, streamText, type ModelMessage } from "ai";
import { NEXA_SYSTEM_PROMPT } from "@/lib/nexa/system-prompt";
import { route, type ForcedProvider } from "@/lib/nexa/router";
import {
  getSearchTools,
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
// Si la búsqueda web se cuelga (en vez de fallar rápido), cuánto esperar
// antes de cortarla y reintentar sin buscar — con margen real bajo los 10s
// duros del plan Hobby.
const SEARCH_ATTEMPT_TIMEOUT_MS = 5_000;
// Límite para un intento normal (sin búsqueda) en la cadena de respaldo de
// un solo proveedor. Sin esto, un proveedor colgado (ej. Google en "alta
// demanda") bloquea toda la función hasta que Vercel la mata a los 10s, en
// vez de dejar que la cadena pase al siguiente proveedor.
const PROVIDER_ATTEMPT_TIMEOUT_MS = 8_000;
// La síntesis del modo "consultar a todos" corre DESPUÉS de gatherAnswers,
// que ya se pudo haber comido hasta ENSEMBLE_PROVIDER_TIMEOUT_MS (7s). Si la
// síntesis usara el mismo presupuesto que un intento normal (8s), el total
// podría llegar a 15s — muy por encima del límite duro de 10s de Vercel
// Hobby. El proveedor sintetizador ya demostró responder rápido durante el
// gather, así que le alcanza un margen bastante más chico.
const SYNTHESIS_ATTEMPT_TIMEOUT_MS = 2_500;

interface ChatRequestBody {
  messages: ModelMessage[];
  mode?: ForcedProvider;
}

async function attemptOnce(
  provider: ProviderId,
  tier: Tier,
  messages: ModelMessage[],
  useSearch: boolean,
  signal?: AbortSignal,
) {
  const model = resolveModel(provider, tier);
  let streamError: unknown;
  const result = streamText({
    model,
    system: NEXA_SYSTEM_PROMPT,
    messages,
    // Búsqueda web nativa del proveedor (ejecutada de su lado, sin round-trip
    // extra); solo Google está implementado/probado por ahora — ver
    // getSearchTools en models.ts.
    tools: useSearch ? getSearchTools(provider) : undefined,
    // Sin esto, un 429 real (ej. grounding sin billing habilitado) se
    // reintenta solo con backoff antes de fallar — convierte un fallo
    // rápido en varios segundos perdidos antes de poder caer al fallback
    // sin búsqueda.
    maxRetries: useSearch ? 0 : undefined,
    abortSignal: signal,
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
  if (first.done && !first.value) {
    // Un stream vacío nunca es una respuesta útil, tenga o no un error
    // explícito adjunto (ej. con la búsqueda web activada, un tool call
    // fallido puede dejar al modelo sin texto que emitir sin marcar
    // streamError). Tratarlo siempre como falla para que dispare el
    // fallback correspondiente en vez de devolver 200 con el cuerpo vacío.
    throw streamError ?? new Error("Respuesta vacía del proveedor.");
  }
  return { reader, first };
}

/** Si el AbortController disparó por nuestro propio timeout (no por otra
 * causa), reemplaza el "AbortError" crudo del SDK (en inglés, poco claro
 * para mostrar en la burbuja) por un mensaje entendible. */
function rethrowClear(err: unknown, signal: AbortSignal): never {
  if (signal.aborted) {
    // Sin punto final: el call site (errors.push) ya le agrega uno.
    throw new Error("Tardó demasiado en responder");
  }
  throw err instanceof Error ? err : new Error(String(err));
}

/**
 * Intenta iniciar el stream con un proveedor. Lee el primer chunk para
 * detectar errores de autenticación/config antes de comprometernos a
 * responder con este proveedor, y así poder pasar al siguiente de la
 * cadena de respaldo (sección 27 del sistema NEXA).
 *
 * `timeoutMs` es overrideable porque este mismo helper se usa tanto para un
 * intento "de cero" (todo el presupuesto disponible) como para la síntesis
 * del modo ensemble, que corre después de gatherAnswers y ya se comió parte
 * del tiempo — ver SYNTHESIS_ATTEMPT_TIMEOUT_MS.
 */
async function attempt(
  provider: ProviderId,
  tier: Tier,
  messages: ModelMessage[],
  useSearch: boolean,
  timeoutMs: number = useSearch ? SEARCH_ATTEMPT_TIMEOUT_MS : PROVIDER_ATTEMPT_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (!useSearch) {
      try {
        return await attemptOnce(provider, tier, messages, false, controller.signal);
      } catch (err) {
        rethrowClear(err, controller.signal);
      }
    }
    // La búsqueda web puede fallar (o directamente colgarse) por falta de
    // acceso/facturación aunque el modelo en sí funcione bien (ej. Google
    // Search grounding devuelve 429 en cuentas sin billing habilitado);
    // reintentamos una vez sin buscar en vez de dar por perdido el
    // proveedor. Un mismo presupuesto de tiempo para los dos intentos: si el
    // reintento sin búsqueda tuviera su propio timeout aparte, un proveedor
    // con la llamada colgada podría tardar el doble de lo pensado.
    try {
      return await attemptOnce(provider, tier, messages, true, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) rethrowClear(err, controller.signal);
      console.error(`[nexa/chat] ${provider} falló con búsqueda web, reintentando sin ella:`, err);
      try {
        return await attemptOnce(provider, tier, messages, false, controller.signal);
      } catch (err2) {
        rethrowClear(err2, controller.signal);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

interface EnsembleAnswer {
  provider: ProviderId;
  text: string;
}

async function queryOnce(
  provider: ProviderId,
  tier: Tier,
  messages: ModelMessage[],
  useSearch: boolean,
  signal: AbortSignal,
): Promise<EnsembleAnswer> {
  const model = resolveModel(provider, tier);
  const { text } = await generateText({
    model,
    system: NEXA_SYSTEM_PROMPT,
    messages,
    tools: useSearch ? getSearchTools(provider) : undefined,
    // Igual que en attemptOnce: sin esto, un 429 real se reintenta solo con
    // backoff antes de fallar, comiéndose presupuesto de tiempo compartido
    // con el reintento sin búsqueda en queryOne.
    maxRetries: useSearch ? 0 : undefined,
    abortSignal: signal,
  });
  return { provider, text };
}

async function queryOne(
  provider: ProviderId,
  tier: Tier,
  messages: ModelMessage[],
  useSearch: boolean,
): Promise<EnsembleAnswer> {
  // Un mismo presupuesto de tiempo para los dos intentos (no uno detrás del
  // otro): si el reintento sin búsqueda sumara su propio timeout aparte,
  // un proveedor con la búsqueda colgada podría tardar el doble del límite
  // pensado — inaceptable con los 10s duros del plan Hobby de Vercel.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENSEMBLE_PROVIDER_TIMEOUT_MS);
  try {
    try {
      return await queryOnce(provider, tier, messages, useSearch, controller.signal);
    } catch (err) {
      if (!useSearch || controller.signal.aborted) rethrowClear(err, controller.signal);
      console.error(`[nexa/chat] ${provider} falló con búsqueda web en el ensemble, reintentando sin ella:`, err);
      try {
        return await queryOnce(provider, tier, messages, false, controller.signal);
      } catch (err2) {
        rethrowClear(err2, controller.signal);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Le pregunta lo mismo a todos los proveedores configurados, en paralelo. */
async function gatherAnswers(chain: ProviderId[], tier: Tier, messages: ModelMessage[], useSearch: boolean) {
  const settled = await Promise.allSettled(chain.map((p) => queryOne(p, tier, messages, useSearch)));
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
  // Búsqueda web solo para la categoría "investigacion" detectada por el
  // router (preguntas por noticias/actualidad/"busca esto"): habilitarla
  // siempre agregaría latencia a cada mensaje sin necesidad.
  const useSearch = decision.category === "investigacion";

  const configuredChain = decision.chain.filter(isProviderConfigured);
  const chainToTry = configuredChain.length > 0 ? configuredChain : decision.chain;

  const errors: string[] = [];

  // Modo "consultar a todos": solo tiene sentido en modo automático (si el
  // usuario fuerza un proveedor puntual, quiere ESE, no una mezcla) y con
  // dos o más proveedores configurados. Con uno solo (el caso de hoy, con
  // solo Gemini activo) se comporta exactamente igual que antes.
  if (mode === "auto" && configuredChain.length >= 2) {
    const { answers, errors: gatherErrors } = await gatherAnswers(configuredChain, decision.tier, messages, useSearch);
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
              "X-Nexa-Warnings": encodeURIComponent(JSON.stringify(errors)),
            },
          });
        }

        const synthesisMessages = buildSynthesisMessages(messages, lastUserText, answers);
        // La síntesis solo combina texto ya investigado por el gather; no
        // necesita volver a buscar en internet. Presupuesto de tiempo más
        // chico que un intento normal porque corre después del gather, que
        // ya se pudo haber comido varios segundos — ver
        // SYNTHESIS_ATTEMPT_TIMEOUT_MS.
        const { reader, first } = await attempt(
          synthesizer,
          decision.tier,
          synthesisMessages,
          false,
          SYNTHESIS_ATTEMPT_TIMEOUT_MS,
        );

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
            "X-Nexa-Warnings": encodeURIComponent(JSON.stringify(errors)),
          },
        });
      } catch (err) {
        // La síntesis falló pero ya tenemos al menos una respuesta cruda:
        // mandamos la mejor (la de mayor prioridad) en vez de un error duro.
        console.error("[nexa/chat] síntesis falló, devolviendo mejor respuesta cruda:", err);
        const best = answers[0];
        const synthesisError = `Síntesis: ${err instanceof Error ? err.message : "error desconocido"}.`;
        return new Response(best.text, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Nexa-Provider": best.provider,
            "X-Nexa-Model": modelIdFor(best.provider, decision.tier),
            "X-Nexa-Category": decision.category,
            "X-Nexa-Sources": best.provider,
            "X-Nexa-Warnings": encodeURIComponent(JSON.stringify([...errors, synthesisError])),
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
        const { reader, first } = await attempt(provider, decision.tier, messages, useSearch);
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
