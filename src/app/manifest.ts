import type { MetadataRoute } from "next";

/**
 * Con esto, el navegador ofrece "instalar" NEXA como una app (ícono en el
 * escritorio/dock/menú inicio, ventana propia sin barra de direcciones) —
 * ver botón "Instalar" en la barra de direcciones de Chrome/Edge, o
 * "Compartir → Agregar a inicio" en Safari/iOS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXA — IA multimodelo",
    short_name: "NEXA",
    description:
      "Asistente personal, académico, creativo y productivo que combina ChatGPT, Claude y Gemini.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    lang: "es",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-icon?size=512&maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
