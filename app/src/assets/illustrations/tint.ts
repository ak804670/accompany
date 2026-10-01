/** Color baked into the illustration SVG files. Not the live brand primary. */
const ACCENT = '#7A4E32';

/** Replaces the baked illustration accent with the active Accompany color. */
export function tintIllustration(svg: string, accent: string): string {
  if (accent.toLowerCase() === ACCENT.toLowerCase()) return svg;
  return svg.replaceAll(ACCENT, accent).replaceAll(ACCENT.toLowerCase(), accent);
}

/** Fits an illustration inside a square of `max` without stretching it. */
export function fittedSize(svg: string, max: number): { width: number; height: number } {
  const box = svg.match(/viewBox="\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)"/);
  const width = Number(box?.[1]);
  const height = Number(box?.[2]);
  if (!width || !height) return { width: max, height: max };
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
