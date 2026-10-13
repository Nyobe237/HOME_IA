import React from "react";
import { Img, staticFile } from "remotion";

/** Logo CONNECT intégré depuis son fichier ; proportions toujours préservées (hauteur auto). */
export const Logo: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => (
  <Img src={staticFile("assets/logo_connect.png")} style={{ width, height: "auto", display: "block", ...style }} />
);
