import { isProviderConfigured, type ProviderId, type Tier } from "./models";

export type Category =
  | "razonamiento"
  | "investigacion"
  | "escritura"
  | "programacion"
  | "matematicas"
  | "analisis_documentos"
  | "traduccion"
  | "educacion"
  | "creatividad"
  | "automatizacion"
  | "analisis_datos"
  | "general";

export type ForcedProvider = ProviderId | "auto";

export interface RouteDecision {
  category: Category;
  tier: Tier;
  /** Proveedores en orden de preferencia; el primero configurado y disponible se usa. */
  chain: ProviderId[];
  reason: string;
}

interface CategoryRule {
  category: Category;
  keywords: RegExp;
  /** Orden de proveedores preferido para esta categoría (sección 3 y 4). */
  chain: ProviderId[];
}

/**
 * Orden de preferencia global: proveedores gratuitos primero (Gemini como
 * principal, Groq por su velocidad, OpenRouter como respaldo con acceso a
 * muchos modelos), y los de pago al final solo como último recurso si el
 * usuario los configura. `route()` igual filtra a los que tengan clave.
 */
const FREE_FIRST_CHAIN: ProviderId[] = ["google", "groq", "openrouter", "openai", "anthropic"];

// El orden de las reglas importa: la primera que haga match gana. El `chain`
// de cada regla comparte el mismo orden global (ver FREE_FIRST_CHAIN); lo
// que varía por categoría es la detección, no la preferencia de proveedor.
const RULES: CategoryRule[] = [
  {
    category: "programacion",
    keywords:
      /\b(codigo|código|programa|programar|funcion|función|bug|debug|api|script|python|javascript|typescript|react|next\.?js|sql|base de datos|backend|frontend|endpoint|repositorio|git|compila|refactor)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "matematicas",
    keywords:
      /\b(matematic|matemátic|ecuacion|ecuación|deriva|integral|algebra|álgebra|geometr|probabilidad|estadistic|estadístic|calcula|resuelve.*problema)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "investigacion",
    keywords:
      /\b(investiga|busca|averigua|últimas noticias|noticias recientes|qué dicen las fuentes|fuentes actualizadas|actualidad|hoy en día|tendencias)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "analisis_documentos",
    keywords:
      /\b(resume este documento|resumen del (pdf|documento|texto)|analiza este (documento|texto|archivo)|documento extenso|texto largo|revisa este documento)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "escritura",
    keywords:
      /\b(redacta|escribe|ensayo|articulo|artículo|carta|correo|guion|guión|historia|cuento|poema|novela|corrige este texto|mejora la redaccion|mejora la redacción)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "creatividad",
    keywords:
      /\b(idea(s)? creativa|lluvia de ideas|brainstorm|invent|concepto artistico|concepto artístico|nombre para|eslogan|slogan)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "traduccion",
    keywords: /\b(traduce|traducción|traduccion|translate)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "educacion",
    keywords:
      /\b(tarea|examen|estudiar|explicame|explícame|enseñame|enséñame|que significa|qué significa|como funciona|cómo funciona|nivel (primaria|secundaria|universidad))\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "analisis_datos",
    keywords:
      /\b(analiza estos datos|csv|excel|hoja de calculo|hoja de cálculo|dataset|dashboard|grafica|gráfica|estadisticas de|estadísticas de)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "automatizacion",
    keywords:
      /\b(automatiza|flujo de trabajo|workflow|integra.*api|conecta.*servicio|agente autonomo|agente autónomo)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
  {
    category: "razonamiento",
    keywords:
      /\b(compara|ventajas y desventajas|analiza|deberia|debería|que opinas|qué opinas|razona|evalua|evalúa)\b/i,
    chain: FREE_FIRST_CHAIN,
  },
];

const COMPLEXITY_SIMPLE = /^[\s\S]{0,40}$/;
const COMPLEXITY_COMPLEX =
  /\b(detallado|a fondo|extenso|profundo|paso a paso|completo|investigacion profunda|investigación profunda)\b/i;

function detectTier(input: string): Tier {
  if (input.length > 600 || COMPLEXITY_COMPLEX.test(input)) return "advanced";
  if (COMPLEXITY_SIMPLE.test(input.trim())) return "fast";
  return "general";
}

function detectCategory(input: string): { category: Category; chain: ProviderId[] } {
  for (const rule of RULES) {
    if (rule.keywords.test(input)) {
      return { category: rule.category, chain: rule.chain };
    }
  }
  return { category: "general", chain: FREE_FIRST_CHAIN };
}

/**
 * Clasifica automáticamente la solicitud del usuario y decide qué modelo(s)
 * usar, con una cadena de respaldo en caso de que el proveedor principal
 * falle o no tenga clave configurada (sección 4, 26 y 27 del sistema).
 */
export function route(input: string, forced: ForcedProvider = "auto"): RouteDecision {
  const { category, chain } = detectCategory(input);
  const tier = detectTier(input);

  const orderedChain =
    forced === "auto"
      ? chain
      : [forced, ...chain.filter((p) => p !== forced)];

  const available = orderedChain.filter(isProviderConfigured);

  return {
    category,
    tier,
    chain: available.length > 0 ? available : orderedChain,
    reason:
      forced === "auto"
        ? `Categoría detectada: ${category}. Nivel: ${tier}.`
        : `Modelo forzado por el usuario: ${forced}.`,
  };
}
