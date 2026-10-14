import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, COLORS, EASE, FONTS, RING } from "../theme";
import { TL, prog, useAbsFrame } from "../time";
import { useLayout } from "../layout";
import { Logo } from "../components/Logo";
import { EndcardProducts } from "../three/EndcardProducts";

const ev = TL.events;
const NNBSP = " ";

const PhoneGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path
      d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
      fill={color}
    />
  </svg>
);

/**
 * S8 — Signature. Collection 3D + logo + coordonnées. Tout est en place à endStableFrom (1088)
 * puis strictement immobile jusqu'à la dernière image.
 */
export const S8EndCard: React.FC = () => {
  const f = useAbsFrame();
  const { isV } = useLayout();
  const bg = prog(f, 1056, 1068, EASE.inOut);
  const stable = ev.endStableFrom; // 1088
  const logoP = prog(f, 1064, ev.logoHit + 8, EASE.out);
  const dashP = prog(f, ev.logoHit, stable - 4, EASE.inOut);
  const t1 = prog(f, 1070, 1082, EASE.out);
  const t2 = prog(f, 1073, 1085, EASE.out);
  const t3 = prog(f, 1076, stable, EASE.out);
  const t4 = prog(f, 1078, stable, EASE.out);
  const rise = (t: number, d = 22) => ({ opacity: t, transform: `translateY(${(1 - t) * d}px)` });

  const logoW = isV ? 760 : 620;
  const block: React.CSSProperties = isV
    ? { position: "absolute", left: 90, width: 900, top: 230, display: "flex", flexDirection: "column", alignItems: "center" }
    : { position: "absolute", left: 1080, width: 760, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };
  const contact: React.CSSProperties = isV
    ? { position: "absolute", left: 90, width: 900, top: 1395, display: "flex", flexDirection: "column", alignItems: "center" }
    : {};

  const cta = (
    <div style={{ ...rise(t3), fontFamily: FONTS.display, fontWeight: 700, fontSize: isV ? 64 : 52, color: COLORS.ink, letterSpacing: "-0.015em", marginTop: isV ? 0 : 46 }}>
      Parlons de vos besoins.
    </div>
  );
  const phone = (
    <div
      style={{
        ...rise(t4, 16),
        marginTop: isV ? 34 : 26,
        display: "flex",
        alignItems: "center",
        gap: isV ? 22 : 18,
        background: COLORS.red,
        color: COLORS.white,
        borderRadius: 999,
        padding: isV ? "22px 46px 22px 38px" : "18px 40px 18px 32px",
        boxShadow: "0 14px 34px rgba(212,1,2,0.28)",
      }}
    >
      <PhoneGlyph size={isV ? 50 : 42} color={COLORS.white} />
      <span style={{ fontFamily: FONTS.text, fontWeight: 800, fontSize: isV ? 66 : 56, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
        699{NNBSP}922{NNBSP}922
      </span>
    </div>
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: BG.light, opacity: bg }} />
      <EndcardProducts />
      <div style={block}>
        <div style={{ opacity: logoP, transform: `scale(${0.94 + 0.06 * logoP})` }}>
          <Logo width={logoW} />
        </div>
        <div
          style={{
            width: isV ? 150 : 130,
            height: 6,
            borderRadius: 3,
            background: RING.base,
            marginTop: isV ? 34 : 30,
            transform: `scaleX(${dashP})`,
          }}
        />
        <div style={{ ...rise(t1), marginTop: isV ? 30 : 26, fontFamily: FONTS.text, fontWeight: 700, fontSize: isV ? 54 : 46, color: COLORS.ink, letterSpacing: "-0.01em" }}>
          Informatique &amp; Bureautique
        </div>
        <div style={{ ...rise(t2), marginTop: 10, fontFamily: FONTS.text, fontWeight: 500, fontSize: isV ? 46 : 38, color: COLORS.textMuted }}>
          Douala <span style={{ color: COLORS.red }}>•</span> Yaoundé
        </div>
        {isV ? null : cta}
        {isV ? null : phone}
      </div>
      {isV ? (
        <div style={contact}>
          {cta}
          {phone}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
