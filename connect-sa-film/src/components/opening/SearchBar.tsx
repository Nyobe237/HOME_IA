import React from "react";
import { COLORS, EASE, FONTS } from "../../theme";
import { prog } from "../../time";
import { E, OpeningGeom, pillState } from "./geom";

const CARET_FROM = 103;

/** Nombre de caractères tapés à l'image f (un par entrée de typingCharFrames, son calé dessus). */
export const typedCount = (f: number) => E.typingCharFrames.filter((k) => k <= f).length;

/** Dernière frappe (ou apparition du curseur) avant f, pour le clignotement piloté par l'image. */
const lastKey = (f: number) => {
  let k = CARET_FROM;
  for (const t of E.typingCharFrames) if (t <= f) k = t;
  return k;
};

export const Magnifier: React.FC<{ size: number; color?: string }> = ({ size, color = "#8A8F98" }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" style={{ display: "block" }}>
    <circle cx={10.6} cy={10.6} r={7.6} fill="none" stroke={color} strokeWidth={2.4} />
    <line x1={16.4} y1={16.4} x2={23} y2={23} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
  </svg>
);

/** Corps de la barre (fond blanc, loupe, texte saisi, curseur texte) ; le contour rouge est RedPill. */
export const SearchBarBody: React.FC<{ f: number; g: OpeningGeom }> = ({ f, g }) => {
  const p = pillState(f, g);
  const b = g.bar;
  const fill = prog(f, E.searchBarIn[0] - 2, E.searchBarIn[1], EASE.inOut) * (1 - p.exit);
  if (fill <= 0.001) return null;
  const x0 = p.cx - p.w / 2;
  const y0 = p.cy - p.h / 2;
  const icon = prog(f, 100, 112, EASE.out) * (1 - p.exit);
  const n = typedCount(f);
  const text = E.typingText.slice(0, n);
  const k = lastKey(f);
  const caretOn = f >= CARET_FROM && (f - k) % 16 < 8 && p.exit < 0.5;
  const caretH = b.font * 1.12;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y0,
          width: p.w,
          height: p.h,
          borderRadius: p.h / 2,
          background: COLORS.white,
          opacity: fill,
          boxShadow: `0 ${(g.isV ? 14 : 12) * fill}px ${36 * fill}px rgba(22, 24, 26, ${0.075 * fill}), 0 2px 6px rgba(22,24,26,${0.04 * fill})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x0 + b.iconX - b.icon / 2,
          top: p.cy - b.icon / 2,
          opacity: icon,
          transform: `scale(${0.85 + 0.15 * icon})`,
        }}
      >
        <Magnifier size={b.icon} />
      </div>
      <div
        style={{
          position: "absolute",
          left: x0 + b.textX,
          top: p.cy - b.h / 2,
          height: b.h,
          display: "flex",
          alignItems: "center",
          whiteSpace: "pre",
          fontFamily: FONTS.text,
          fontWeight: 400,
          fontSize: b.font,
          color: COLORS.text,
          letterSpacing: "-0.005em",
          opacity: 1 - p.exit,
        }}
      >
        <span>{text}</span>
        <span
          style={{
            display: "inline-block",
            width: g.isV ? 3 : 2.5,
            height: caretH,
            marginLeft: n > 0 ? 3 : 0,
            borderRadius: 2,
            background: COLORS.red,
            opacity: caretOn ? 1 : 0,
          }}
        />
      </div>
    </>
  );
};
