# NEXA — IA multimodelo

NEXA es un asistente conversacional que enruta automáticamente cada
solicitud al modelo de IA más apropiado (OpenAI/ChatGPT, Anthropic/Claude o
Google/Gemini) según el tipo de tarea, con respaldo automático entre
proveedores si uno falla o no tiene clave configurada. También puede generar
imágenes a partir de una descripción.

## Cómo funciona

- **`src/lib/nexa/system-prompt.ts`** — prompt de identidad de NEXA, se
  envía como mensaje `system` sin importar qué modelo responda.
- **`src/lib/nexa/router.ts`** — clasifica el último mensaje del usuario por
  palabras clave (programación, matemáticas, investigación, escritura,
  análisis de documentos, traducción, etc.), estima la complejidad (nivel
  rápido/general/avanzado) y arma una cadena de proveedores en orden de
  preferencia para esa categoría.
- **`src/lib/nexa/models.ts`** — catálogo de modelos por proveedor y nivel,
  configurable por variables de entorno.
- **`src/app/api/chat/route.ts`** — recibe la conversación, decide la ruta,
  intenta el primer proveedor disponible de la cadena y hace *streaming* de
  la respuesta; si el proveedor falla (sin clave, error de red, error de la
  API) pasa automáticamente al siguiente de la cadena.
- **`src/app/api/image/route.ts`** — genera imágenes con el modelo de
  imágenes de OpenAI.
- **`src/app/page.tsx`** + `src/components/*` — interfaz de chat con
  selector de modo (Automático / ChatGPT / Claude / Gemini forzado),
  indicador de qué modelo respondió cada mensaje, botón para adjuntar
  archivos de texto plano como contexto y botón para cambiar a modo
  generación de imágenes.

El usuario nunca necesita elegir el modelo manualmente: el modo
"Automático" es el predeterminado. Forzar un proveedor sigue respetando la
cadena de respaldo (si el forzado falla, se intenta con los demás).

## Requisitos

- Node.js 20+
- Al menos una clave de API de OpenAI, Anthropic o Google. Con las tres
  configuradas, NEXA puede aprovechar todo el sistema de enrutamiento y
  respaldo descrito arriba.

## Configuración

```bash
cp .env.example .env.local
```

Completa las claves que tengas disponibles en `.env.local`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

Las claves **solo** se usan en el servidor (rutas `route.ts` bajo
`src/app/api`); nunca se exponen al navegador. Los IDs de modelo por
proveedor también son configurables por variable de entorno — revisa
`.env.example` y ajústalos al catálogo vigente de cada proveedor si es
necesario.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Compilar y ejecutar en producción

```bash
npm run build
npm run start
```

## Desplegar

Cualquier plataforma compatible con Next.js (por ejemplo
[Vercel](https://vercel.com/new)) funciona: configura las mismas variables
de entorno de `.env.example` en el panel de la plataforma antes de
desplegar.

## Limitaciones conocidas / próximos pasos

- El adjuntar archivos solo lee texto plano en el navegador (`.txt`, `.md`,
  `.csv`, `.json`, código fuente); no incluye un parser de PDF/DOCX/XLSX.
- No incluye todavía autenticación, base de datos, memoria persistente ni
  búsqueda en internet en vivo — el enrutador está preparado para
  incorporar esas herramientas como pasos adicionales del pipeline
  (`src/lib/nexa/router.ts` y las rutas `api/*`) sin cambiar la interfaz.
- La generación de imágenes usa el modelo de imágenes de OpenAI
  (`OPENAI_IMAGE_MODEL`); para usar otro proveedor de imágenes, añade su
  cliente en `src/lib/nexa/models.ts` y una rama en
  `src/app/api/image/route.ts`.
