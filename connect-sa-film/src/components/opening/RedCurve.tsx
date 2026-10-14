import React from "react";
import { EASE, RING } from "../../theme";
import { prog, lerp } from "../../time";
import { E, OpeningGeom, curveSlice, getCurve } from "./geom";

/** Apparition du petit tiret rouge de la présentation. */
export const DASH_IN: [number, number] = [256, 268];
const RING_DONE = E.curveSweep[1]; // 342

/** Fenêtre visible [s0, s1] (abscisse curviligne) de la trajectoire tiret -> courbe -> ellipse. */
export const curveSpan = (f: number, g: OpeningGeom) => {
  const c = getCurve(g);
  const len = g.pres.dash.len;
  const dashIn = prog(f, DASH_IN[0], DASH_IN[1], EASE.out);
  const head = prog(f, E.curveSweep[0], E.curveSweep[1], EASE.inOut);
  const tail = prog(f, E.curveSweep[0] + 6, E.curveSweep[1], EASE.inOut);
  return { c, s0: c.Lin * tail, s1: len * dashIn + (c.Ltot - len) * head };
};

/**
 * Le tiret rouge s'étire en courbe, balaie l'écran et se referme en ellipse :
 * à l'image 342 il ne reste que l'ellipse seams.ringAt342 (style RING : cœur + halo flou).
 */
export const RedCurve: React.FC<{ f: number; g: OpeningGeom }> = ({ f, g }) => {
  if (f < DASH_IN[0]) return null;
  const { c, s0, s1 } = curveSpan(f, g);
  const d = f >= RING_DONE ? c.loopD : curveSlice(c, s0, s1);
  if (!d) return null;
  const [a] = E.curveSweep;
  const ringT = prog(f, a, a + 28, EASE.inOut);
  const sw = lerp(6, RING.coreWidthPx, ringT);
  const glow = RING.glowOpacity * prog(f, a + 4, RING_DONE - 4, EASE.inOut);
  const core = prog(f, a + 2, a + 26, EASE.inOut);
  const id = `ringGlow${g.isV ? "V" : "H"}`;
  return (
    <svg width={g.W} height={g.H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={-200} y={-200} width={g.W + 400} height={g.H + 400}>
          <feGaussianBlur stdDeviation={RING.glowBlurPx / 2} />
        </filter>
      </defs>
      {glow > 0.001 ? (
        <path d={d} fill="none" stroke={RING.core} strokeWidth={sw * 2.6} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id})`} opacity={glow} />
      ) : null}
      <path d={d} fill="none" stroke={RING.base} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      {core > 0.001 ? (
        <path d={d} fill="none" stroke={RING.core} strokeWidth={sw * 0.46} strokeLinecap="round" strokeLinejoin="round" opacity={core} />
      ) : null}
    </svg>
  );
};

/** Ellipse cible seams.ringAt342 en contour cyan (contrôle du raccord S3 -> S4). */
export const SeamOutline: React.FC<{ g: OpeningGeom }> = ({ g }) => {
  const r = g.ring;
  return (
    <svg width={g.W} height={g.H} style={{ position: "absolute", left: 0, top: 0 }}>
      <ellipse
        cx={r.cx}
        cy={r.cy}
        rx={r.rx}
        ry={r.ry}
        transform={`rotate(${r.rotationDeg} ${r.cx} ${r.cy})`}
        fill="none"
        stroke="#00E5FF"
        strokeWidth={1}
      />
      <line x1={r.cx - 12} y1={r.cy} x2={r.cx + 12} y2={r.cy} stroke="#00E5FF" strokeWidth={1} />
      <line x1={r.cx} y1={r.cy - 12} x2={r.cx} y2={r.cy + 12} stroke="#00E5FF" strokeWidth={1} />
    </svg>
  );
};
