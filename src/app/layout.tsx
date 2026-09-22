import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXA — IA multimodelo",
  description:
    "Asistente personal, académico, creativo y productivo que combina ChatGPT, Claude y Gemini.",
  // Permite "instalarla" en iOS (Compartir → Agregar a inicio) con ícono y
  // ventana propios en vez de abrir Safari; en Chrome/Edge de escritorio el
  // ícono de instalar sale solo a partir del manifest (ver manifest.ts).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEXA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sin esto, Safari en iOS no achica el viewport cuando aparece el
  // teclado — el layout fijo a 100dvh queda con contenido tapado o
  // cortado detrás del teclado. Con "resizes-content" el layout se
  // recalcula igual que en Chrome/Android.
  interactiveWidget: "resizes-content",
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
