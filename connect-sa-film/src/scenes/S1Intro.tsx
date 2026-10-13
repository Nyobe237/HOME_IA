import React from "react";
import { AbsoluteFill } from "remotion";
import { useAbsFrame } from "../time";

/** Provisoire : S1Intro */
export const S1Intro: React.FC = () => {
  const f = useAbsFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "Inter", fontSize: 40, color: "#999" }}>
      S1Intro — {f}
    </AbsoluteFill>
  );
};
