import React, { createContext, useContext } from "react";
import { Sequence, useCurrentFrame, interpolate } from "remotion";
import timeline from "./timeline.json";
import { EASE } from "./theme";

export const TL = timeline;
export const FPS = timeline.fps;

const OffsetCtx = createContext(0);

/** Fenêtre de montage : monte les enfants entre [from, to[ (images absolues). */
export const Window: React.FC<{ from: number; to: number; premount?: number; name?: string; children: React.ReactNode }> = ({
  from,
  to,
  premount = 15,
  name,
  children,
}) => (
  <Sequence from={from} durationInFrames={to - from} premountFor={premount} name={name}>
    <OffsetCtx.Provider value={from}>{children}</OffsetCtx.Provider>
  </Sequence>
);

/** Numéro d'image absolu dans le film (0..1199), quel que soit l'emboîtement. */
export const useAbsFrame = () => useCurrentFrame() + useContext(OffsetCtx);

/** Progression 0..1 entre deux images absolues, avec courbe. */
export const prog = (frame: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
