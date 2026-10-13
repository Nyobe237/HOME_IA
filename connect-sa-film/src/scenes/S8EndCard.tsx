import React from "react";
import { AbsoluteFill } from "remotion";
import { useAbsFrame } from "../time";

/** Provisoire : S8EndCard */
export const S8EndCard: React.FC = () => {
  const f = useAbsFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "Inter", fontSize: 40, color: "#999" }}>
      S8EndCard — {f}
    </AbsoluteFill>
  );
};
