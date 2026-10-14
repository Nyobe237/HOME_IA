/**
 * Échelle « vitrine » : chaque appareil est normalisé pour que les silhouettes se lisent bien
 * (copieur le plus haut, les autres comparables) — pas l'échelle réelle.
 * Les dimensions sont lues à l'exécution dans DEVICE_DIMS (jamais codées en dur ici).
 */
import { DEVICE_DIMS, DeviceKind } from "../devices";

const SHOW: Record<DeviceKind, { axis: "w" | "h"; size: number }> = {
  copier: { axis: "h", size: 1.34 },
  desktop: { axis: "w", size: 1.08 },
  printer: { axis: "w", size: 0.84 },
  laptop: { axis: "w", size: 0.78 },
  toner: { axis: "w", size: 0.64 },
  accessories: { axis: "w", size: 0.8 },
};

export const showScale = (k: DeviceKind) => {
  const d = DEVICE_DIMS[k];
  const s = SHOW[k];
  return s.size / Math.max(1e-3, d[s.axis]);
};

/** Dimensions (unités scène) d'un appareil à l'échelle vitrine, multipliées par un facteur éventuel. */
export const showDims = (k: DeviceKind, mul = 1) => {
  const d = DEVICE_DIMS[k];
  const s = showScale(k) * mul;
  return { w: d.w * s, h: d.h * s, d: d.d * s, s };
};
