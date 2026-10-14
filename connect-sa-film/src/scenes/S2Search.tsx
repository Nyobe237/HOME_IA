import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, COLORS, EASE } from "../theme";
import { useAbsFrame, prog } from "../time";
import { useLayout } from "../layout";
import { RedPill } from "../components/opening/RedPill";
import { SearchBarBody } from "../components/opening/SearchBar";
import { Pointer, SkeletonRow } from "../components/opening/Results";
import { ConnectCard } from "../components/opening/ConnectCard";
import { CARD_HANDOFF, E, S2_BG_FROM, arrowTarget, getGeom, pointerPos } from "../components/opening/geom";

/**
 * S2 — recherche simulée générique : barre en pilule (contour rouge = trait de S1), saisie calée sur
 * typingCharFrames, résultats (squelette / carte CONNECT / squelette), pointeur, survol, clic, onde,
 * puis la carte se soulève et se centre (S3 la reprend à l'image CARD_HANDOFF).
 */
export const S2Search: React.FC = () => {
  const f = useAbsFrame();
  const L = useLayout();
  const g = getGeom(L.isV);

  // pointeur
  const pIn = f >= E.cursorIn;
  const [px, py] = pointerPos(f, g);
  const down = prog(f, E.clickDown, E.click, EASE.out);
  const up = prog(f, E.clickUp, E.clickUp + 4, EASE.out);
  const pScale = 1 - 0.13 * down * (1 - up);
  const pOp = 1 - prog(f, E.cardLift[0] + 2, E.cardLift[0] + 12, EASE.inOut);

  // onde rouge du clic (anneau extérieur, non masqué)
  const [r0, r1] = E.rippleS2;
  const rp = prog(f, r0, r1, EASE.out);
  const rp2 = prog(f, r0 + 4, r1, EASE.out);
  const [tx, ty] = arrowTarget(g);

  return (
    <AbsoluteFill>
      {f >= S2_BG_FROM ? <AbsoluteFill style={{ background: BG.light }} /> : null}
      <SearchBarBody f={f} g={g} />
      <RedPill f={f} g={g} />
      <SkeletonRow f={f} g={g} which={1} />
      <SkeletonRow f={f} g={g} which={2} />
      {f < CARD_HANDOFF ? <ConnectCard f={f} g={g} /> : null}
      {f >= r0 && f < r1 ? (
        <svg width={g.W} height={g.H} style={{ position: "absolute", left: 0, top: 0 }}>
          <circle cx={tx} cy={ty} r={g.rippleR * rp} fill="none" stroke={COLORS.red} strokeWidth={3.2 * (1 - rp) + 0.8} opacity={0.9 * (1 - rp)} />
          {rp2 > 0 ? (
            <circle cx={tx} cy={ty} r={g.rippleR * 0.62 * rp2} fill="none" stroke={COLORS.red} strokeWidth={2 * (1 - rp2) + 0.6} opacity={0.6 * (1 - rp2)} />
          ) : null}
        </svg>
      ) : null}
      {pIn && pOp > 0.001 ? <Pointer x={px} y={py} size={g.pointer.size} scale={pScale} opacity={pOp} /> : null}
    </AbsoluteFill>
  );
};
