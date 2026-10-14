import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, COLORS, EASE, FONTS } from "../theme";
import { useAbsFrame, prog } from "../time";
import { useLayout } from "../layout";
import { ConnectCard } from "../components/opening/ConnectCard";
import { MaskLine } from "../components/opening/MaskLine";
import { RedCurve } from "../components/opening/RedCurve";
import { CARD_HANDOFF, E, getGeom } from "../components/opening/geom";

const TITLE_IN = 258;
const SUB_IN = 265;

/**
 * S3 — la carte se déplie en présentation CONNECT (façade, logo, tiret rouge, textes),
 * puis le tiret s'étire en courbe et se referme en ellipse (seams.ringAt342) pendant que
 * le fond passe au graphite et que la présentation se réduit et s'efface.
 */
export const S3Presentation: React.FC = () => {
  const f = useAbsFrame();
  const L = useLayout();
  const g = getGeom(L.isV);
  if (f < CARD_HANDOFF) return <AbsoluteFill />;
  const p = g.pres;
  const [b0, b1] = E.bgToGraphite;
  const dark = prog(f, b0, b1, EASE.inOut);
  const shrink = prog(f, 304, 340, EASE.inOut);
  const logoOp = 1 - prog(f, 302, 316, EASE.inOut);
  const textOp = 1 - prog(f, 304, 318, EASE.inOut);
  const panelOp = 1 - prog(f, 308, 334, EASE.inOut);
  const [ox, oy] = p.exitOrigin;
  const left = p.align === "left";
  let k = 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: BG.light }} />
      {dark > 0 ? <AbsoluteFill style={{ background: BG.graphite, opacity: dark }} /> : null}
      <AbsoluteFill style={{ transform: `scale(${(1 - 0.14 * shrink).toFixed(5)})`, transformOrigin: `${ox}px ${oy}px` }}>
        <ConnectCard f={f} g={g} logoOpacity={logoOp} panelOpacity={panelOp} />
        <div style={{ position: "absolute", inset: 0, opacity: textOp }}>
          {p.title.lines.map((line, i) => {
            const words = line.split(" ").map((t) => ({ text: t }));
            const off = k;
            k += words.length;
            return (
              <MaskLine
                key={i}
                f={f}
                words={words}
                top={p.title.top + i * p.title.lineH}
                lineH={p.title.lineH}
                fontSize={p.title.font}
                inStart={TITLE_IN}
                inStagger={3}
                inDur={18}
                wordIndexOffset={off}
                weight={700}
                family={FONTS.display}
                color={COLORS.ink}
                letterSpacing="-0.015em"
                align={left ? "left" : "center"}
                left={p.textX}
              />
            );
          })}
          <MaskLine
            f={f}
            words={[{ text: "Douala" }, { text: "•", color: COLORS.red }, { text: "Yaoundé" }]}
            top={p.sub.top}
            lineH={p.sub.lineH}
            fontSize={p.sub.font}
            inStart={SUB_IN}
            inStagger={3}
            inDur={18}
            weight={500}
            family={FONTS.text}
            color={COLORS.textMuted}
            letterSpacing="-0.005em"
            align={left ? "left" : "center"}
            left={p.textX}
          />
        </div>
      </AbsoluteFill>
      <RedCurve f={f} g={g} />
    </AbsoluteFill>
  );
};
