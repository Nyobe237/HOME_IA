import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { TL } from "./time";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ConnectHorizontal" component={Film} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1920} height={1080} />
    <Composition id="ConnectVertical" component={Film} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1080} height={1920} />
  </>
);
