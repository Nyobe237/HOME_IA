/**
 * Textes 2D du studio : titre d'orbite (S4), blocs héros (S5), titre + légende de la collection (S6).
 * Révélation par masque (mots qui montent, décalage 3 images), pilotée par l'image.
 */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { COLORS, EASE, FONTS, RING } from "../../theme";
import { prog } from "../../time";
import { useLayout } from "../../layout";
import { DEVICE_LABELS, DeviceKind } from "../devices";
import { HERO_TEXT, T } from "./choreo";

/** Une ligne de mots révélés par masque. */
export const RevealLine: React.FC<{
  text: string;
  f: number;
  start: number;
  out?: [number, number];
  stagger?: number;
  dur?: number;
  style?: React.CSSProperties;
  wordStyle?: (i: number) => React.CSSProperties | undefined;
}> = ({ text, f, start, out, stagger = 3, dur = 16, style, wordStyle }) => {
  const words = text.split(" ");
  return (
    <div style={{ whiteSpace: "nowrap", ...style }}>
      {words.map((w, i) => {
        const pin = prog(f, start + i * stagger, start + i * stagger + dur, EASE.out);
        const pout = out ? prog(f, out[0] + i * 1.5, out[1] + i * 1.5, EASE.in) : 0;
        const y = (1 - pin) * 112 - pout * 112;
        const op = Math.min(1, pin * 1.6) * (1 - pout);
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "top",
                padding: "0.14em 0.04em 0.2em",
                margin: "-0.14em -0.04em -0.2em",
              }}
            >
              <span style={{ display: "inline-block", transform: `translateY(${y}%)`, opacity: op, ...wordStyle?.(i) }}>{w}</span>
            </span>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* S4 : titre d'orbite                                                 */
/* ------------------------------------------------------------------ */

const OrbitTitle: React.FC<{ f: number }> = ({ f }) => {
  const { isV } = useLayout();
  if (f < T.titleIn - 2 || f > T.titleOut[1] + 8) return null;
  const base: React.CSSProperties = {
    fontFamily: FONTS.display,
    fontWeight: 700,
    color: COLORS.white,
    letterSpacing: "-0.012em",
    lineHeight: 1.08,
    textShadow: "0 2px 24px rgba(0,0,0,0.35)",
  };
  if (isV) {
    return (
      <div style={{ position: "absolute", left: 72, right: 72, top: 214, textAlign: "center", fontSize: 76, ...base }}>
        <RevealLine text="Votre équipement" f={f} start={T.titleIn} out={T.titleOut} />
        <RevealLine text="entre en scène." f={f} start={T.titleIn + 6} out={[T.titleOut[0] + 3, T.titleOut[1] + 3]} />
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 120, top: 96, fontSize: 64, ...base }}>
      <RevealLine text="Votre équipement entre en scène." f={f} start={T.titleIn} out={T.titleOut} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* S5 : blocs héros                                                    */
/* ------------------------------------------------------------------ */

const HERO_COPY: Record<"laptop" | "printer" | "copier", { label: string; lines: [string, string] }> = {
  laptop: { label: "Ordinateurs portables", lines: ["Vos idées.", "En mouvement."] },
  printer: { label: "Imprimantes", lines: ["Vos documents.", "Avec précision."] },
  copier: { label: "Copieurs multifonctions", lines: ["Copier. Numériser.", "Partager."] },
};

const HeroBlock: React.FC<{ f: number; k: "laptop" | "printer" | "copier" }> = ({ f, k }) => {
  const { isV } = useLayout();
  const t = HERO_TEXT[k];
  if (f < t.in - 2 || f > t.out[1] + 6) return null;
  const copy = HERO_COPY[k];
  const dashIn = prog(f, t.in, t.in + 12, EASE.out);
  const outP = prog(f, t.out[0], t.out[1], EASE.in);
  const labelIn = prog(f, t.in + 3, t.in + 15, EASE.out);
  const pos: React.CSSProperties = isV
    ? { position: "absolute", left: 88, right: 72, bottom: 1920 - 1612 }
    : { position: "absolute", left: 1096, width: 740, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" };
  const tagSize = isV ? 84 : 72;
  // voile graphite doux derrière le texte : lisibilité garantie quel que soit l'arrière-plan 3D
  const scrimA = prog(f, t.in - 2, t.in + 10, EASE.out) * (1 - prog(f, t.out[0], t.out[1] + 4, EASE.inOut));
  const scrim: React.CSSProperties = isV
    ? { position: "absolute", left: 0, right: 0, top: 1150, height: 770, background: "radial-gradient(ellipse 85% 60% at 40% 62%, rgba(19,20,23,0.86) 0%, rgba(19,20,23,0.55) 45%, rgba(19,20,23,0) 100%)" }
    : { position: "absolute", left: 900, right: 0, top: 0, bottom: 0, background: "radial-gradient(ellipse 62% 58% at 48% 50%, rgba(19,20,23,0.86) 0%, rgba(19,20,23,0.5) 48%, rgba(19,20,23,0) 100%)" };
  return (
    <>
    <div style={{ ...scrim, opacity: scrimA }} />
    <div style={pos}>
      <div>
        <div
          style={{
            width: 64,
            height: 6,
            borderRadius: 3,
            background: RING.core,
            boxShadow: `0 0 14px ${RING.base}`,
            transformOrigin: "left center",
            transform: `scaleX(${dashIn * (1 - outP)})`,
            marginBottom: isV ? 26 : 24,
          }}
        />
        <div
          style={{
            fontFamily: FONTS.text,
            fontWeight: 600,
            fontSize: isV ? 40 : 32,
            letterSpacing: "0.01em",
            color: "#B4B9C1",
            opacity: labelIn * (1 - outP),
            transform: `translateY(${(1 - labelIn) * 18 - outP * 14}px)`,
            marginBottom: isV ? 18 : 14,
          }}
        >
          {copy.label}
        </div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: tagSize, lineHeight: 1.06, letterSpacing: "-0.015em", color: COLORS.white }}>
          <RevealLine text={copy.lines[0]} f={f} start={t.in + 5} out={[t.out[0] - 2, t.out[1] - 2]} />
          <RevealLine
            text={copy.lines[1]}
            f={f}
            start={t.in + 10}
            out={[t.out[0], t.out[1]]}
            style={{ color: "#D9DCE1" }}
          />
        </div>
      </div>
    </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* S6 : titre + légende                                                */
/* ------------------------------------------------------------------ */

const LEGEND_ORDER: DeviceKind[] = ["laptop", "desktop", "printer", "copier", "toner", "accessories"];

const CollectionText: React.FC<{ f: number }> = ({ f }) => {
  const { isV } = useLayout();
  if (f < T.collectionTitleIn - 2) return null;
  const titleStyle: React.CSSProperties = {
    fontFamily: FONTS.display,
    fontWeight: 700,
    color: COLORS.ink,
    letterSpacing: "-0.015em",
    lineHeight: 1.08,
  };
  const item = (k: DeviceKind, i: number, size: number) => {
    const p = prog(f, 842 + i * 4, 858 + i * 4, EASE.out);
    return (
      <div
        key={k}
        style={{
          display: "flex",
          alignItems: "center",
          gap: size * 0.45,
          opacity: p,
          transform: `translateY(${(1 - p) * 16}px)`,
          fontFamily: FONTS.text,
          fontWeight: 500,
          fontSize: size,
          color: COLORS.text,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: size * 0.36,
            height: size * 0.36,
            borderRadius: "50%",
            background: COLORS.red,
            flex: "none",
            transform: `scale(${interpolate(p, [0, 0.6, 1], [0, 1.25, 1])})`,
          }}
        />
        {DEVICE_LABELS[k]}
      </div>
    );
  };
  if (isV) {
    const left = LEGEND_ORDER.slice(0, 3);
    const right = LEGEND_ORDER.slice(3);
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 72, right: 72, top: 214, textAlign: "center", fontSize: 76, ...titleStyle }}>
          <RevealLine text="Tout pour" f={f} start={T.collectionTitleIn} />
          <RevealLine text="votre bureau." f={f} start={T.collectionTitleIn + 6} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1408, display: "flex", justifyContent: "center", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>{left.map((k, i) => item(k, i * 2, 40))}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>{right.map((k, i) => item(k, i * 2 + 1, 40))}</div>
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 96, fontSize: 64, ...titleStyle }}>
        <RevealLine text="Tout pour votre bureau." f={f} start={T.collectionTitleIn} />
      </div>
      <div style={{ position: "absolute", left: 1420, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
        {LEGEND_ORDER.map((k, i) => item(k, i, 32))}
      </div>
    </AbsoluteFill>
  );
};

export const StageOverlay: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <OrbitTitle f={f} />
    <HeroBlock f={f} k="laptop" />
    <HeroBlock f={f} k="printer" />
    <HeroBlock f={f} k="copier" />
    <CollectionText f={f} />
  </AbsoluteFill>
);
