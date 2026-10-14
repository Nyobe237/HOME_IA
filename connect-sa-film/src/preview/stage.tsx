/**
 * Prévisualisation du domaine « studio 3D » (S4–S6 + produits S8).
 * npx remotion still src/preview/stage.tsx StageH out/preview/stage/x.png --frame=460
 */
import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { loadFonts } from "../fonts";
import { BG } from "../theme";
import { TL, Window } from "../time";
import { useLayout } from "../layout";
import { StageScene } from "../scenes/StageScene";
import { EndcardProducts } from "../three/EndcardProducts";

const SeamOverlay: React.FC = () => {
  const { isV, W, H } = useLayout();
  const s = TL.seams.ringAt342[isV ? "vertical" : "horizontal"];
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <ellipse
        cx={s.cx}
        cy={s.cy}
        rx={s.rx}
        ry={s.ry}
        transform={`rotate(${s.rotationDeg} ${s.cx} ${s.cy})`}
        fill="none"
        stroke="#00E5FF"
        strokeWidth={1}
      />
      <circle cx={s.cx} cy={s.cy} r={3} fill="#00E5FF" />
    </svg>
  );
};

const StagePreview: React.FC<{ seam?: boolean }> = ({ seam }) => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: "#FFFFFF" }}>
      <Window from={TL.windows.STAGE[0]} to={TL.windows.STAGE[1]} premount={30}>
        <StageScene />
      </Window>
      {seam ? <SeamOverlay /> : null}
    </AbsoluteFill>
  );
};

const EndcardPreview: React.FC = () => {
  loadFonts();
  const { isV } = useLayout();
  const r = TL.seams.endcardProductsRegion[isV ? "vertical" : "horizontal"];
  return (
    <AbsoluteFill style={{ background: BG.light }}>
      <div
        style={{
          position: "absolute",
          left: r.x,
          top: r.y,
          width: r.w,
          height: r.h,
          border: "1px dashed rgba(0,150,200,0.35)",
          boxSizing: "border-box",
        }}
      />
      <Window from={TL.windows.S8[0]} to={TL.windows.S8[1]} premount={30}>
        <EndcardProducts />
      </Window>
    </AbsoluteFill>
  );
};

const N = TL.durationInFrames;
const Root: React.FC = () => (
  <>
    <Composition id="StageH" component={StagePreview} durationInFrames={N} fps={30} width={1920} height={1080} />
    <Composition id="StageV" component={StagePreview} durationInFrames={N} fps={30} width={1080} height={1920} />
    <Composition id="SeamH" component={StagePreview} defaultProps={{ seam: true }} durationInFrames={N} fps={30} width={1920} height={1080} />
    <Composition id="SeamV" component={StagePreview} defaultProps={{ seam: true }} durationInFrames={N} fps={30} width={1080} height={1920} />
    <Composition id="EndcardH" component={EndcardPreview} durationInFrames={N} fps={30} width={1920} height={1080} />
    <Composition id="EndcardV" component={EndcardPreview} durationInFrames={N} fps={30} width={1080} height={1920} />
  </>
);

registerRoot(Root);
