import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { BG } from "../theme";
import { prog, useAbsFrame } from "../time";
import { useLayout } from "../layout";
import { computeStage, T } from "../three/stage/choreo";
import { StageWorld } from "../three/stage/StageWorld";
import { StageOverlay } from "../three/stage/Overlay";

/**
 * Studio 3D (S4 orbite, S5 héros, S6 collection) — fenêtre STAGE 326..960.
 * Calques : fond CSS (graphite -> clair), canevas 3D transparent (ombres sur le fond CSS), textes 2D.
 */
export const StageScene: React.FC = () => {
  const f = useAbsFrame();
  const { isV, W, H } = useLayout();
  const st = computeStage(f, isV);
  const fade = prog(f, T.fadeIn[0], T.fadeIn[1], (t) => t);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ background: BG.graphite }} />
      <AbsoluteFill style={{ background: BG.light, opacity: st.light }} />
      <ThreeCanvas
        width={W}
        height={H}
        dpr={1}
        shadows
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <StageWorld st={st} isV={isV} W={W} H={H} />
      </ThreeCanvas>
      <StageOverlay f={f} />
    </AbsoluteFill>
  );
};
