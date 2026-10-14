import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, COLORS, FONTS } from "../theme";
import { useAbsFrame } from "../time";
import { useLayout } from "../layout";
import { MaskLine } from "../components/opening/MaskLine";
import { RedPill } from "../components/opening/RedPill";
import { E, LINE_HANDOFF, getGeom } from "../components/opening/geom";

const OU_GREY = "#8E939B";

/**
 * S1 — « Du matériel informatique ? » / « Douala ou Yaoundé. »
 * Révélation par masque (mots qui montent, décalage 3 i), trait rouge qui se dessine sous la ligne 1,
 * sortie : le texte remonte hors de ses masques, le trait s'ouvre en contour de barre (repris par S2 à 90).
 */
export const S1Intro: React.FC = () => {
  const f = useAbsFrame();
  const L = useLayout();
  const g = getGeom(L.isV);
  const s = g.s1;
  const [x0] = E.s1Exit;
  let wi = 0;
  return (
    <AbsoluteFill style={{ background: BG.light }}>
      {s.l1Words.map((words, li) => {
        const off = wi;
        wi += words.length;
        return (
          <MaskLine
            key={li}
            f={f}
            words={words.map((t) => ({ text: t }))}
            top={s.l1Tops[li]}
            lineH={s.l1LineH}
            fontSize={s.l1Font}
            inStart={E.line1In}
            inStagger={3}
            inDur={20}
            outStart={x0}
            outStagger={2}
            outDur={12}
            wordIndexOffset={off}
            weight={700}
            family={FONTS.display}
            color={COLORS.ink}
            letterSpacing="-0.018em"
          />
        );
      })}
      <MaskLine
        f={f}
        words={[{ text: "Douala" }, { text: "ou", color: OU_GREY }, { text: "Yaoundé." }]}
        top={s.l2Top}
        lineH={s.l2LineH}
        fontSize={s.l2Font}
        inStart={E.line2In}
        inStagger={3}
        inDur={18}
        outStart={x0 + 3}
        outStagger={2}
        outDur={12}
        weight={600}
        family={FONTS.display}
        color={COLORS.ink}
        letterSpacing="-0.012em"
      />
      {f < LINE_HANDOFF ? <RedPill f={f} g={g} /> : null}
    </AbsoluteFill>
  );
};
