import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useAbsFrame } from "../time";
import { useLayout } from "../layout";
import { computeEndcard } from "./stage/choreo";
import { EndcardWorld } from "./stage/StageWorld";

/**
 * Collection 3D de la carte de fin (fenêtre S8 1056..1200, fond transparent : le parent dessine BG.light).
 * Même formation que S6, recadrée dans seams.endcardProductsRegion. Montée pendant endcardIn,
 * puis parfaitement immobile à partir de endStableFrom (1088).
 */
export const EndcardProducts: React.FC = () => {
  const f = useAbsFrame();
  const { isV, W, H } = useLayout();
  const st = computeEndcard(f, isV);
  return (
    <AbsoluteFill style={{ opacity: st.appear }}>
      <ThreeCanvas width={W} height={H} dpr={1} shadows gl={{ alpha: true, antialias: true }} style={{ position: "absolute", left: 0, top: 0 }}>
        <EndcardWorld st={st} W={W} H={H} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
