/**
 * Icônes de services au trait (SVG 120x120), tracé animé par `p` (0..1). Encre + accent rouge.
 */
import React from "react";
import { COLORS } from "../../theme";

const SW = 4.2;
type P = { p: number };

const stroke = (p: number, color: string, delay = 0, span = 1): React.SVGProps<SVGPathElement> => {
  const t = Math.min(1, Math.max(0, (p - delay) / span));
  return {
    fill: "none",
    stroke: color,
    strokeWidth: SW,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1 - t,
  };
};

/** Installation : écran + coche rouge (poste installé, prêt à l'emploi). */
export const IconInstall: React.FC<P> = ({ p }) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%">
    <path d="M22 30 h76 a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h-76 a6 6 0 0 1 -6 -6 v-44 a6 6 0 0 1 6 -6 z" {...stroke(p, COLORS.ink, 0, 0.6)} />
    <path d="M60 86 v12 M42 100 h36" {...stroke(p, COLORS.ink, 0.35, 0.35)} />
    <path d="M44 58 l11 11 l22 -23" {...stroke(p, COLORS.red, 0.55, 0.45)} />
  </svg>
);

const gearPath = (cx: number, cy: number, rIn: number, rOut: number, teeth: number) => {
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const w = (Math.PI * 2) / teeth;
    const seq = [
      [rIn, a0],
      [rOut, a0 + w * 0.18],
      [rOut, a0 + w * 0.5],
      [rIn, a0 + w * 0.68],
    ];
    for (const [r, a] of seq) pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
};

/** Maintenance & SAV : engrenage rouge + clé à molette. */
export const IconMaintenance: React.FC<P> = ({ p }) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%">
    <path d={gearPath(72, 46, 19, 26, 8)} {...stroke(p, COLORS.red, 0, 0.6)} />
    <circle cx={72} cy={46} r={8} {...(stroke(p, COLORS.red, 0.2, 0.4) as React.SVGProps<SVGCircleElement>)} />
    <path
      d="M24 96 l30 -30 a14 14 0 0 1 4 -18 l-8 10 l7 7 l10 -8 a14 14 0 0 1 -18 4 l-30 30 a5 5 0 0 1 -7 -7 z"
      {...stroke(p, COLORS.ink, 0.3, 0.7)}
    />
  </svg>
);

/** Location de copieurs : copieur + flèches circulaires rouges (contrat renouvelable). */
export const IconRental: React.FC<P> = ({ p }) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%">
    <path d="M30 40 h50 v12 h-50 z M26 52 h58 a4 4 0 0 1 4 4 v36 a4 4 0 0 1 -4 4 h-58 a4 4 0 0 1 -4 -4 v-36 a4 4 0 0 1 4 -4 z" {...stroke(p, COLORS.ink, 0, 0.6)} />
    <path d="M34 68 h34 M34 80 h34" {...stroke(p, COLORS.ink, 0.35, 0.3)} />
    <path d="M86 26 a20 20 0 0 1 14 22 M100 48 l-6 -5 M100 48 l5 -6" {...stroke(p, COLORS.red, 0.5, 0.5)} />
    <path d="M100 62 a20 20 0 0 1 -6 10" {...stroke(p, COLORS.red, 0.6, 0.4)} />
  </svg>
);
