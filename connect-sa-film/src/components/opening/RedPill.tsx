import React from "react";
import { COLORS } from "../../theme";
import { OpeningGeom, pillPath, pillState } from "./geom";

/**
 * Le trait rouge de S1 qui devient le contour (2 px) de la barre de recherche de S2.
 * Dessiné par S1 avant LINE_HANDOFF puis par S2 : même fonction -> raccord exact.
 */
export const RedPill: React.FC<{ f: number; g: OpeningGeom; opacity?: number }> = ({ f, g, opacity = 1 }) => {
  const p = pillState(f, g);
  if (p.w < 0.5) return null;
  const op = opacity * (1 - p.exit);
  if (op <= 0.001) return null;
  return (
    <svg width={g.W} height={g.H} style={{ position: "absolute", left: 0, top: 0, opacity: op }}>
      <path
        d={pillPath(p.cx, p.cy, p.w, p.h)}
        fill="none"
        stroke={COLORS.red}
        strokeWidth={p.sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
