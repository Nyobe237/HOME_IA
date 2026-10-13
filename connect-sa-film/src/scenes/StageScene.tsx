import React from "react";
import { AbsoluteFill } from "remotion";
import { useAbsFrame } from "../time";

/** Provisoire : StageScene */
export const StageScene: React.FC = () => {
  const f = useAbsFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "Inter", fontSize: 40, color: "#999" }}>
      StageScene — {f}
    </AbsoluteFill>
  );
};
