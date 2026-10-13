import React from "react";
import { AbsoluteFill } from "remotion";
import { useAbsFrame } from "../time";

/** Provisoire : S7Services */
export const S7Services: React.FC = () => {
  const f = useAbsFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "Inter", fontSize: 40, color: "#999" }}>
      S7Services — {f}
    </AbsoluteFill>
  );
};
