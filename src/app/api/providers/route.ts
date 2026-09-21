import { isProviderConfigured } from "@/lib/nexa/models";

export const runtime = "nodejs";

/**
 * Le dice al selector de modelo qué proveedores tienen clave configurada,
 * para no dejar elegir uno que va a fallar. Nunca expone las claves en sí.
 */
export async function GET() {
  return Response.json({
    openai: isProviderConfigured("openai"),
    anthropic: isProviderConfigured("anthropic"),
    google: isProviderConfigured("google"),
  });
}
