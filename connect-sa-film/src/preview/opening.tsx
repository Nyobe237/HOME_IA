import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { COLORS } from "../theme";
import { TL, Window } from "../time";
import { loadFonts } from "../fonts";
import { useLayout } from "../layout";
import { S1Intro } from "../scenes/S1Intro";
import { S2Search } from "../scenes/S2Search";
import { S3Presentation } from "../scenes/S3Presentation";
import { SeamOutline } from "../components/opening/RedCurve";
import { getGeom } from "../components/opening/geom";

/** Ouverture S1–S3 montée exactement comme dans Film.tsx (mêmes fenêtres, mêmes images absolues). */
const Opening: React.FC = () => {
  loadFonts();
  const w = TL.windows;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      <Window from={w.S1[0]} to={w.S1[1]} name="S1 Intro"><S1Intro /></Window>
      <Window from={w.S2[0]} to={w.S2[1]} name="S2 Recherche"><S2Search /></Window>
      <Window from={w.S3[0]} to={w.S3[1]} name="S3 Présentation"><S3Presentation /></Window>
    </AbsoluteFill>
  );
};

/** Contrôle du raccord S3 -> S4 : contour cyan de seams.ringAt342 par-dessus l'ouverture. */
const SeamCheck: React.FC = () => {
  const L = useLayout();
  return (
    <AbsoluteFill>
      <Opening />
      <SeamOutline g={getGeom(L.isV)} />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <>
    <Composition id="OpeningH" component={Opening} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1920} height={1080} />
    <Composition id="OpeningV" component={Opening} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1080} height={1920} />
    <Composition id="SeamCheckH" component={SeamCheck} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1920} height={1080} />
    <Composition id="SeamCheckV" component={SeamCheck} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1080} height={1920} />
  </>
);

registerRoot(Root);
