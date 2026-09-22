import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { StarIcon } from "@/lib/nexa/star-icon";

/**
 * Íconos de la PWA (192/512, normal y "maskable") para el manifest —
 * separado de icon.tsx/apple-icon.tsx porque esos son para el ícono de
 * pestaña/iOS, tamaños fijos por convención de archivo; el manifest
 * necesita tamaños específicos (192x192, 512x512) que no coinciden con
 * ninguno de esos dos.
 */
export async function GET(request: NextRequest) {
  const sizeParam = Number(request.nextUrl.searchParams.get("size"));
  const size = sizeParam === 512 ? 512 : 192;
  const maskable = request.nextUrl.searchParams.get("maskable") === "1";
  // Los íconos "maskable" pueden recortarse en formas distintas (círculo,
  // squircle, etc. — Android adaptive icons); el contenido tiene que vivir
  // en la "safe zone" central (~80%) para no perder el símbolo al recortar.
  const sizePercent = maskable ? 38 : 62;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        }}
      >
        <StarIcon sizePercent={sizePercent} />
      </div>
    ),
    { width: size, height: size },
  );
}
