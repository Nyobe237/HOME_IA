import React from "react";
import { EASE, FONTS } from "../../theme";
import { prog } from "../../time";

export type MaskWord = { text: string; color?: string };

/**
 * Ligne de texte révélée par masque : chaque mot monte dans sa fenêtre (décalage `stagger`),
 * puis ressort par le haut à la sortie. Tout est piloté par l'image `f` (absolue).
 */
export const MaskLine: React.FC<{
  f: number;
  words: MaskWord[];
  top: number;
  lineH: number;
  fontSize: number;
  inStart: number;
  inStagger?: number;
  inDur?: number;
  outStart?: number;
  outStagger?: number;
  outDur?: number;
  wordIndexOffset?: number;
  weight?: number;
  family?: string;
  color?: string;
  letterSpacing?: string;
  align?: "center" | "left";
  left?: number;
}> = ({
  f,
  words,
  top,
  lineH,
  fontSize,
  inStart,
  inStagger = 3,
  inDur = 18,
  outStart = 1e9,
  outStagger = 2,
  outDur = 13,
  wordIndexOffset = 0,
  weight = 700,
  family = FONTS.display,
  color = "#16181A",
  letterSpacing = "-0.015em",
  align = "center",
  left = 0,
}) => (
  <div
    style={{
      position: "absolute",
      left: align === "center" ? 0 : left,
      right: align === "center" ? 0 : undefined,
      top,
      height: lineH,
      overflow: "hidden",
      textAlign: align,
      whiteSpace: "nowrap",
      fontFamily: family,
      fontWeight: weight,
      fontSize,
      lineHeight: `${lineH}px`,
      letterSpacing,
      color,
      fontKerning: "normal",
    }}
  >
    {words.map((w, i) => {
      const k = i + wordIndexOffset;
      const pin = prog(f, inStart + k * inStagger, inStart + k * inStagger + inDur, EASE.out);
      const pout = prog(f, outStart + k * outStagger, outStart + k * outStagger + outDur, EASE.inOut);
      const y = (1 - pin) * lineH * 0.92 - pout * lineH * 0.92;
      const op = Math.min(1, 0.15 + pin * 1.2) * (1 - pout * pout);
      return (
        <React.Fragment key={i}>
          {i > 0 ? " " : null}
          <span style={{ display: "inline-block", transform: `translateY(${y.toFixed(2)}px)`, opacity: op, color: w.color }}>
            {w.text}
          </span>
        </React.Fragment>
      );
    })}
  </div>
);
