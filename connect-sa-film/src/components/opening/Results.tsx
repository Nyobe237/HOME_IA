import React from "react";
import { COLORS, EASE } from "../../theme";
import { prog } from "../../time";
import { E, OpeningGeom, listOffset } from "./geom";

const SK = "#ECEEF1";

/** Ligne de résultat « squelette » (générique, sans texte) avec léger reflet piloté par l'image. */
export const SkeletonRow: React.FC<{ f: number; g: OpeningGeom; which: 1 | 2 }> = ({ f, g, which }) => {
  const row = which === 1 ? g.list.skel1 : g.list.skel2;
  const [a] = E.resultsSkeletonIn;
  const start = a + (which === 1 ? 0 : 3);
  const enter = prog(f, start, start + 11, EASE.out);
  const exit = prog(f, E.cardLift[0], E.cardLift[0] + 13, EASE.inOut);
  const op = enter * (1 - exit);
  if (op <= 0.001) return null;
  const dy = (1 - enter) * 26 + exit * (which === 1 ? -36 : 36);
  const y = row.y + listOffset(f, g) + dy;
  const thumb = row.h * 0.56;
  const pad = (row.h - thumb) / 2;
  const bar1 = g.isV ? 20 : 16;
  const bar2 = g.isV ? 15 : 12;
  // reflet : une bande claire traverse la ligne toutes les ~40 images
  const sweep = ((f - start) % 44) / 44;
  const shimmer = `linear-gradient(100deg, ${SK} ${(sweep * 140 - 30).toFixed(1)}%, #F6F7F9 ${(sweep * 140 - 15).toFixed(1)}%, ${SK} ${(sweep * 140).toFixed(1)}%)`;
  const barStyle = (w: string, h: number): React.CSSProperties => ({ width: w, height: h, borderRadius: h / 2, background: shimmer });
  return (
    <div
      style={{
        position: "absolute",
        left: g.list.x,
        top: y,
        width: g.list.w,
        height: row.h,
        borderRadius: g.card.radius,
        background: "rgba(255,255,255,0.72)",
        boxShadow: `inset 0 0 0 1.5px ${COLORS.line}`,
        opacity: op * 0.9,
        display: "flex",
        alignItems: "center",
        paddingLeft: pad,
        gap: pad * 0.9,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: thumb, height: thumb, borderRadius: thumb * 0.24, background: shimmer, flex: "none" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: g.isV ? 16 : 13 }}>
        <div style={barStyle(which === 1 ? "430px" : "380px", bar1)} />
        <div style={barStyle(which === 1 ? "270px" : "300px", bar2)} />
      </div>
    </div>
  );
};

/** Pointeur souris : flèche noire, liseré blanc, ombre douce. La pointe est en (x, y). */
export const Pointer: React.FC<{ x: number; y: number; size: number; scale?: number; opacity?: number }> = ({
  x,
  y,
  size,
  scale = 1,
  opacity = 1,
}) => {
  const u = size / 32; // 1 unité de viewBox en px ; la pointe est en (1, 1)
  return (
    <svg
      width={26 * u}
      height={36 * u}
      viewBox="-2 -2 26 36"
      style={{
        position: "absolute",
        left: x - 3 * u,
        top: y - 3 * u,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: `${3 * u}px ${3 * u}px`,
        filter: "drop-shadow(0px 3px 4px rgba(0,0,0,0.28)) drop-shadow(0px 8px 14px rgba(0,0,0,0.12))",
        overflow: "visible",
      }}
    >
      <path
        d="M1 1 L1 25.2 L6.9 19.8 L10.9 29 L15.1 27.2 L11.2 18.2 L19.2 18.2 Z"
        fill="#111214"
        stroke="#FFFFFF"
        strokeWidth={1.9}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
};
