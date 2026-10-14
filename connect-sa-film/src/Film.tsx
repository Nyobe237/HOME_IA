import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { COLORS } from "./theme";
import { TL, Window } from "./time";
import { loadFonts } from "./fonts";
import { S1Intro } from "./scenes/S1Intro";
import { S2Search } from "./scenes/S2Search";
import { S3Presentation } from "./scenes/S3Presentation";
import { StageScene } from "./scenes/StageScene";
import { S7Services } from "./scenes/S7Services";
import { S8EndCard } from "./scenes/S8EndCard";

export const HAS_AUDIO = true;

export const Film: React.FC = () => {
  loadFonts();
  const w = TL.windows;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      <Window from={w.S1[0]} to={w.S1[1]} name="S1 Intro"><S1Intro /></Window>
      <Window from={w.S2[0]} to={w.S2[1]} name="S2 Recherche"><S2Search /></Window>
      <Window from={w.S3[0]} to={w.S3[1]} name="S3 Présentation"><S3Presentation /></Window>
      <Window from={w.STAGE[0]} to={w.STAGE[1]} premount={30} name="S4-S6 Studio"><StageScene /></Window>
      <Window from={w.S7[0]} to={w.S7[1]} name="S7 Services"><S7Services /></Window>
      <Window from={w.S8[0]} to={w.S8[1]} premount={30} name="S8 Fin"><S8EndCard /></Window>
      {HAS_AUDIO ? <Audio src={staticFile("audio/connect_mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
