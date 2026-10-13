import { Easing } from "remotion";

/**
 * Palette de travail rattachée à l'identité CONNECT disponible (logo fourni).
 * Rouge et noir échantillonnés sur le logo ; gris et graphite = couleurs de mise en scène,
 * pas une charte officielle.
 */
export const COLORS = {
  white: "#FFFFFF",
  red: "#D40102", // rouge du logo (échantillonné)
  redDeep: "#A30002",
  redGlow: "#FF2A1F",
  ink: "#16181A", // noir du logo (échantillonné)
  text: "#1B1D21",
  textMuted: "#5B6068",
  lightGrey: "#F2F3F5",
  midGrey: "#D5D8DD",
  line: "#E4E6EA",
  graphite: "#1C1E22",
  graphiteDeep: "#131417",
  graphiteSoft: "#2B2E34",
} as const;

export const FONTS = {
  text: "Inter, 'Inter Fallback', Arial, sans-serif",
  display: "'Inter Display', Inter, Arial, sans-serif",
} as const;

/** Courbes d'animation communes (une seule direction artistique). */
export const EASE = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 0.75, 0.06),
  soft: Easing.bezier(0.33, 0, 0.2, 1),
} as const;

/** Fonds partagés : le passage clair -> graphite doit être identique entre S3 et le studio. */
export const BG = {
  light: "radial-gradient(ellipse 80% 70% at 50% 42%, #FFFFFF 0%, #F7F8F9 55%, #ECEEF1 100%)",
  graphite: "radial-gradient(ellipse 75% 65% at 50% 45%, #2E3137 0%, #1C1E22 55%, #111214 100%)",
} as const;

/** Style de la trajectoire rouge (2D et 3D doivent correspondre au raccord S3 -> S4). */
export const RING = {
  core: "#FF2A1F",
  base: COLORS.red,
  coreWidthPx: 5,
  glowBlurPx: 18,
  glowOpacity: 0.55,
} as const;
