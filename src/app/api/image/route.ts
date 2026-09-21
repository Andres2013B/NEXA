import { generateImage } from "ai";
import { openai, OPENAI_IMAGE_MODEL, isProviderConfigured } from "@/lib/nexa/models";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ImageRequestBody {
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
}

// Pollinations.ai genera imágenes gratis y sin API key: no lo pude probar en
// este entorno (el sandbox bloquea la salida a image.pollinations.ai), así
// que si la respuesta cambia de formato revisá esto primero.
const POLLINATIONS_TIMEOUT_MS = 45_000;

async function generateWithPollinations(prompt: string, size: string): Promise<string> {
  const [width, height] = size.split("x").map(Number);
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), POLLINATIONS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Pollinations respondió ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithOpenAI(
  prompt: string,
  size: "1024x1024" | "1024x1792" | "1792x1024",
): Promise<string> {
  const { image } = await generateImage({
    model: openai.image(OPENAI_IMAGE_MODEL),
    prompt,
    size,
  });
  return `data:${image.mediaType};base64,${image.base64}`;
}

export async function POST(req: Request) {
  const { prompt, size = "1024x1024" } = (await req.json()) as ImageRequestBody;

  if (!prompt || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Falta el prompt de la imagen." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const errors: string[] = [];

  try {
    const image = await generateWithPollinations(prompt, size);
    return new Response(JSON.stringify({ image, provider: "pollinations" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[nexa/image] Pollinations falló:", err);
    errors.push(`Pollinations: ${err instanceof Error ? err.message : "error desconocido"}.`);
  }

  if (isProviderConfigured("openai")) {
    try {
      const image = await generateWithOpenAI(prompt, size);
      return new Response(JSON.stringify({ image, provider: "openai" }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[nexa/image] OpenAI falló:", err);
      errors.push(`OpenAI: ${err instanceof Error ? err.message : "error desconocido"}.`);
    }
  } else {
    errors.push("OpenAI: falta la clave de API (respaldo no disponible).");
  }

  return new Response(
    JSON.stringify({ error: "No se pudo generar la imagen.", details: errors }),
    { status: 502, headers: { "Content-Type": "application/json" } },
  );
}
