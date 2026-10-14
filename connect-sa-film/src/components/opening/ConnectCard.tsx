import React from "react";
import { Img, staticFile } from "remotion";
import { COLORS, EASE, FONTS } from "../../theme";
import { prog, lerp } from "../../time";
import { Logo } from "../Logo";
import { E, OpeningGeom, arrowTarget, cardState, logoH } from "./geom";

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Mélange de deux couleurs #rrggbb -> #rrggbb. */
const mix = (a: string, b: string, t: number) => {
  const pa = rgb(a);
  const pb = rgb(b);
  return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, "0")).join("");
};
const rgba = (h: string, a: number) => `rgba(${rgb(h).join(",")},${a.toFixed(3)})`;

/** Petite flèche du bouton (trait). */
const ArrowIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M5 12 H18.5 M13 6.5 L18.8 12 L13 17.5" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Zoom lent de la façade (1,00 -> 1,05) ; recadrage de base 1,05 pour masquer les coins arrondis du fichier source. */
const FACADE_BASE = 1.05;
export const facadeZoom = (f: number) => FACADE_BASE * (1 + 0.05 * prog(f, 252, 342, (t) => t));

/**
 * Carte de résultat CONNECT ; la même fonction d'état sert S2 (liste, survol, clic, soulèvement)
 * et S3 (dépliage en présentation : la carte devient le cadre de la façade, le logo s'en détache).
 */
export const ConnectCard: React.FC<{
  f: number;
  g: OpeningGeom;
  logoOpacity?: number;
  panelOpacity?: number;
}> = ({ f, g, logoOpacity = 1, panelOpacity = 1 }) => {
  const cs = cardState(f, g);
  if (cs.enter <= 0.001) return null;
  const { rect, pre, s } = cs;
  const c = g.card;
  const fac = g.pres.facade;

  // contour : gris -> rouge au survol, s'efface au dépliage
  const borderT = cs.hover * (1 - cs.unfold);
  const borderA = 1 - cs.unfold;
  const borderW = (1.5 + 0.7 * cs.hover) * s;
  const borderCol = mix(COLORS.line, COLORS.red, borderT);
  const sh = (k: number) => k.toFixed(3);
  const lift = cs.lift;
  const un = cs.unfold;
  const shadow = [
    `inset 0 0 0 ${borderW.toFixed(2)}px ${rgba(borderCol, borderA)}`,
    `0 ${lerp(2, 8, lift)}px ${lerp(8, 18, lift)}px rgba(22,24,26,${sh(0.05 + 0.03 * lift)})`,
    `0 ${lerp(10, 34, Math.max(lift, un))}px ${lerp(26, 70, Math.max(lift, un))}px rgba(22,24,26,${sh(0.05 + 0.12 * Math.max(lift, un * 0.9))})`,
    `0 ${14 * cs.hover * (1 - lift)}px ${30 * cs.hover * (1 - lift)}px rgba(212,1,2,${sh(0.1 * cs.hover * (1 - lift))})`,
  ].join(", ");

  // ondulation intérieure du clic (dans la carte)
  const rp = prog(f, E.rippleS2[0], E.rippleS2[1], EASE.out);
  const [tx, ty] = arrowTarget(g);
  const rippleOn = f >= E.rippleS2[0] && f < E.rippleS2[1];

  // révélation de la façade : jamais sous le logo (le logo reste sur fond clair)
  const lh = logoH(cs.logo.w);
  let mask: string;
  if (!g.isV) {
    const edge = cs.logo.x - 34 - rect.x;
    mask = `linear-gradient(to right, #000 0px, #000 ${(edge - 90).toFixed(1)}px, transparent ${edge.toFixed(1)}px)`;
  } else {
    const edge = cs.logo.y + lh + 30 - rect.y;
    mask = `linear-gradient(to bottom, transparent ${edge.toFixed(1)}px, #000 ${(edge + 90).toFixed(1)}px)`;
  }

  const btn = c.btn * s;
  const btnX = pre.x + pre.w - c.btnRight * s - btn;
  const btnY = pre.y + pre.h / 2 - btn / 2;
  const pressed = cs.press;
  const btnBg = mix(mix(COLORS.lightGrey, COLORS.red, cs.btnHover), COLORS.redDeep, pressed * 0.6);
  const arrowCol = mix(COLORS.text, COLORS.white, cs.btnHover);

  const textX = pre.x + c.pad * s;
  const textY = pre.y + c.padTop * s + logoH(c.logoW * s) + c.gap * s;
  const [t1, t2] = c.lines.length > 1 ? c.lines : c.lines[0].split(" — ");

  return (
    <>
      {/* panneau : carte -> cadre de la façade */}
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: cs.radius,
          background: COLORS.white,
          boxShadow: shadow,
          overflow: "hidden",
          opacity: panelOpacity,
        }}
      >
        {rippleOn ? (
          <div
            style={{
              position: "absolute",
              left: tx - rect.x - g.rippleR * 1.6 * rp,
              top: ty - rect.y - g.rippleR * 1.6 * rp,
              width: g.rippleR * 3.2 * rp,
              height: g.rippleR * 3.2 * rp,
              borderRadius: "50%",
              background: `rgba(212,1,2,${(0.09 * (1 - rp)).toFixed(3)})`,
            }}
          />
        ) : null}
        {cs.photo > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: rect.w,
              height: rect.h,
              opacity: cs.photo,
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          >
            <Img
              src={staticFile("assets/facade_reference.png")}
              style={{
                position: "absolute",
                left: fac.x - rect.x,
                top: fac.y - rect.y,
                width: fac.w,
                height: fac.h,
                objectFit: "cover",
                transform: `scale(${facadeZoom(f).toFixed(5)})`,
                transformOrigin: "50% 50%",
              }}
            />
          </div>
        ) : null}
        {/* coins : bord intérieur clair très léger pour une finition nette sur la photo */}
        {cs.photo > 0.001 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: cs.radius,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.35 * cs.photo).toFixed(3)})`,
            }}
          />
        ) : null}
      </div>

      {/* texte de la carte (s'efface au dépliage) */}
      {cs.textOpacity > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: textX,
            top: textY,
            fontFamily: FONTS.text,
            fontSize: c.font * s,
            lineHeight: 1.22,
            fontWeight: 500,
            color: COLORS.text,
            whiteSpace: "nowrap",
            opacity: cs.textOpacity * panelOpacity,
            letterSpacing: "-0.005em",
          }}
        >
          {g.isV ? (
            <>
              <div>{t1}</div>
              <div style={{ color: COLORS.textMuted }}>{t2}</div>
            </>
          ) : (
            <>
              {t1}
              <span style={{ color: COLORS.textMuted }}> — {t2}</span>
            </>
          )}
        </div>
      ) : null}

      {/* bouton flèche */}
      {cs.btnOpacity > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: btnX,
            top: btnY,
            width: btn,
            height: btn,
            borderRadius: "50%",
            background: btnBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: cs.btnOpacity,
            transform: `scale(${(1 - 0.08 * pressed) * (0.85 + 0.15 * cs.btnOpacity)})`,
          }}
        >
          <ArrowIcon size={btn * 0.5} color={arrowCol} />
        </div>
      ) : null}

      {/* logo (toujours sur fond clair) */}
      <div style={{ position: "absolute", left: cs.logo.x, top: cs.logo.y, opacity: logoOpacity * cs.enter }}>
        <Logo width={cs.logo.w} />
      </div>
    </>
  );
};
