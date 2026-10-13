import { useVideoConfig } from "remotion";

export type Layout = {
  isV: boolean; // version verticale 1080x1920
  W: number;
  H: number;
  /** unité relative : 1 = 1 px en 1080 de petit côté */
  u: number;
  /** marges de sécurité (zones d'interface des réseaux sociaux en vertical) */
  safe: { x: number; top: number; bottom: number };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  const isV = height > width;
  return {
    isV,
    W: width,
    H: height,
    u: Math.min(width, height) / 1080,
    safe: isV ? { x: 72, top: 200, bottom: 280 } : { x: 120, top: 90, bottom: 90 },
  };
};
