import React from "react";
import { AbsoluteFill } from "remotion";
import { useAbsFrame } from "../time";

/** Provisoire : S3Presentation */
export const S3Presentation: React.FC = () => {
  const f = useAbsFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "Inter", fontSize: 40, color: "#999" }}>
      S3Presentation — {f}
    </AbsoluteFill>
  );
};
