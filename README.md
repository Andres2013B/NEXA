# NEXA — IA multimodelo

NEXA es un asistente conversacional que enruta automáticamente cada
solicitud al modelo de IA más apropiado — priorizando proveedores
**gratuitos** (Google/Gemini, Groq, OpenRouter) y dejando OpenAI/ChatGPT y
Anthropic/Claude (de pago) como último recurso si están configurados — con
respaldo automático entre proveedores si uno falla o no tiene clave
configurada. También puede generar imágenes gratis (sin clave) usando
Pollinations.ai, con OpenAI como respaldo opcional si está configurado.

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
- **`src/app/api/chat/route.ts`** — recibe la conversación y decide la ruta.
  Con **un solo** proveedor configurado, intenta ese y hace *streaming*
  directo (con respaldo si falla). Con **dos o más**, en modo automático
  les pregunta lo mismo a todos en paralelo y usa el de mayor prioridad
  disponible para sintetizar una sola respuesta final a partir de todas
  (ver "Modo consultar a todos" más abajo).
- **`src/app/api/image/route.ts`** — genera imágenes con Pollinations.ai
  (gratis, sin API key); si falla, cae a OpenAI (`OPENAI_IMAGE_MODEL`) solo
  si está configurado.
- **`src/app/page.tsx`** + `src/components/*` — landing con asistente
  flotante (`FloatingAIButton`); al abrirlo, `AIChatPanel` ocupa toda la
  pantalla con un sidebar de conversaciones (`ConversationSidebar`, fijo en
  desktop, drawer en mobile) — indicador de qué modelo respondió cada
  mensaje, botón para adjuntar imágenes o archivos de texto como contexto y
  botón para cambiar a modo generación de imágenes.
- **`src/lib/nexa/useNexaChat.ts`** — hook que maneja múltiples
  conversaciones (persistidas en `localStorage` del navegador, sin backend),
  streaming, reintentos y el envío de adjuntos multimodales.

El usuario **no elige el modelo**: NEXA siempre enruta en modo automático
según la categoría detectada, sin selector en la interfaz. Si querés forzar
un proveedor puntual, el backend (`route()` en `router.ts`, parámetro `mode`
de `/api/chat`) sigue soportándolo — solo no está expuesto en la UI (forzar
un proveedor se lo pregunta solo a ese, nunca activa el modo ensemble).

### Modo "consultar a todos"

Con dos o más proveedores configurados, cada mensaje en modo automático:

1. Le pregunta lo mismo a **todos** los proveedores configurados en
   paralelo (`generateText`, no streaming, con un timeout de 7s por
   proveedor para no colgar la función entera).
2. El proveedor de mayor prioridad que haya respondido a tiempo toma todas
   las respuestas y arma **una sola respuesta final**, combinando lo mejor
   de cada una — esa síntesis sí se transmite en *streaming* al usuario.
3. Si algún proveedor falla o tarda de más, se lo ignora y se sintetiza
   igual con los que sí respondieron. Si solo uno respondió, se manda tal
   cual (no hay nada que sintetizar). Si la síntesis en sí falla, cae a
   mandar la respuesta cruda del proveedor de mayor prioridad en vez de dar
   error.

**Advertencia real sobre el plan Hobby de Vercel**: las funciones
serverless ahí tienen un límite duro de 10s sin importar `maxDuration` en
el código. Consultar a 2+ proveedores en paralelo y encima sintetizar
puede superar ese límite fácilmente, sobre todo a medida que sumes más
proveedores configurados. No lo pude probar con 2+ proveedores reales en
este entorno (el sandbox de desarrollo solo tiene salida a la API de
Google) — si en producción empieza a cortarse seguido, hay que evaluar
subir a un plan con más tiempo de ejecución.

## Requisitos

- Node.js 20+
- Al menos una clave de API. Recomendado para no pagar nada:
  - **Google Gemini** — [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
  - **Groq** — [console.groq.com/keys](https://console.groq.com/keys)
  - **OpenRouter** — [openrouter.ai/keys](https://openrouter.ai/keys) (usa
    los modelos con sufijo `:free`)

  OpenAI y Anthropic también son compatibles, pero sus APIs cobran por uso
  desde la primera llamada (no tienen tier gratis permanente como Gemini).
  Con varios proveedores configurados, NEXA aprovecha todo el sistema de
  enrutamiento y respaldo descrito arriba.

## Configuración

```bash
cp .env.example .env.local
```

Completa las claves que tengas disponibles en `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
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

- El historial de conversaciones vive en `localStorage` del navegador — no
  hay cuenta de usuario ni sincronización entre dispositivos; borrar datos
  del sitio borra el historial. Migrar a una base de datos real (con auth)
  es el paso natural si esto crece.
- Adjuntar archivos soporta imágenes (`image/*`, hasta 4MB por archivo,
  enviadas al modelo como contexto visual) y texto plano (`.txt`, `.md`,
  `.csv`, `.json`, código fuente, insertado como texto en el mensaje); no
  incluye un parser de PDF/DOCX/XLSX.
- No incluye todavía autenticación, base de datos, memoria persistente ni
  búsqueda en internet en vivo — el enrutador está preparado para
  incorporar esas herramientas como pasos adicionales del pipeline
  (`src/lib/nexa/router.ts` y las rutas `api/*`) sin cambiar la interfaz.
- La generación de imágenes con Pollinations.ai no se pudo probar en este
  entorno (el sandbox de desarrollo bloquea la salida a
  `image.pollinations.ai`); revisá `src/app/api/image/route.ts` si el
  formato de respuesta cambia. Para sumar otro proveedor de imágenes, seguí
  el mismo patrón (`generateWithX` + intento en orden dentro de `POST`).
- Los IDs de modelo por defecto de Groq y OpenRouter (`GROQ_MODEL_*`,
  `OPENROUTER_MODEL_*` en `.env.example`) no se pudieron probar en este
  entorno por no tener clave propia de esos proveedores — verificalos contra
  el catálogo vigente (`console.groq.com` / `openrouter.ai/models`) apenas
  actives esas claves, igual que se ajustó antes con los modelos de Google.
- Otros proveedores gratuitos/freemium (Mistral, Cloudflare Workers AI,
  Cohere, Hugging Face Inference, SambaNova, NVIDIA API Catalog, Z.ai) no
  están integrados todavía. Seguir el mismo patrón que Groq/OpenRouter en
  `src/lib/nexa/models.ts` (agregar el paquete `@ai-sdk/*` o un cliente
  OpenAI-compatible, el `ProviderId`, la entrada en `MODEL_IDS` y
  `KEY_ENV_VAR`) alcanza para sumarlos.
