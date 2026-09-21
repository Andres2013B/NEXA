import { generateImage } from "ai";
import { openai, OPENAI_IMAGE_MODEL, isProviderConfigured } from "@/lib/nexa/models";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ImageRequestBody {
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
}

export async function POST(req: Request) {
  if (!isProviderConfigured("openai")) {
    return new Response(
      JSON.stringify({
        error: "La generación de imágenes requiere OPENAI_API_KEY configurada.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const { prompt, size = "1024x1024" } = (await req.json()) as ImageRequestBody;

  if (!prompt || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Falta el prompt de la imagen." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { image } = await generateImage({
      model: openai.image(OPENAI_IMAGE_MODEL),
      prompt,
      size,
    });

    return new Response(
      JSON.stringify({
        image: `data:${image.mediaType};base64,${image.base64}`,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "No se pudo generar la imagen.",
        details: err instanceof Error ? err.message : "error desconocido",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
