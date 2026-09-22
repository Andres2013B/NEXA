/**
 * Path de un sparkle/estrella de 4 puntas (el mismo símbolo "✦" que se usa
 * en el resto de la UI), como vector en vez de carácter Unicode: en
 * next/og (Satori), un glyph fuera del set básico requiere descargar una
 * fuente dinámicamente, y esa descarga puede fallar según la red del
 * entorno (pasó en este sandbox) — un path dibujado a mano no depende de
 * ninguna fuente y siempre se ve igual.
 */
export const STAR_PATH =
  "M50,5 L61.31,38.69 L95,50 L61.31,61.31 L50,95 L38.69,61.31 L5,50 L38.69,38.69 Z";

export function StarIcon({ sizePercent = 60 }: { sizePercent?: number }) {
  return (
    <svg
      width={`${sizePercent}%`}
      height={`${sizePercent}%`}
      viewBox="0 0 100 100"
    >
      <path d={STAR_PATH} fill="white" />
    </svg>
  );
}
