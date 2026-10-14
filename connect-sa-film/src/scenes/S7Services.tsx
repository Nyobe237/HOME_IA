import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { BG, COLORS, EASE, FONTS, RING } from "../theme";
import { TL, prog, useAbsFrame } from "../time";
import { useLayout } from "../layout";
import { IconInstall, IconMaintenance, IconRental } from "../components/ending/ServiceIcons";

const ev = TL.events;
const SERVICES = [
  { label: "Installation", Icon: IconInstall },
  { label: "Maintenance & SAV", Icon: IconMaintenance },
  { label: "Location de copieurs", Icon: IconRental },
];

/** S7 — Bien équipés. Bien accompagnés. Trois services reliés par la trajectoire rouge. */
export const S7Services: React.FC = () => {
  const f = useAbsFrame();
  const { isV, W, H } = useLayout();
  const bg = prog(f, 940, 956, EASE.inOut);
  const exit = prog(f, ev.servicesExit[0], ev.servicesExit[1], EASE.in);
  const titleIn = prog(f, ev.servicesTitleIn, ev.servicesTitleIn + 16, EASE.out);
  const title2In = prog(f, ev.servicesTitleIn + 6, ev.servicesTitleIn + 22, EASE.out);

  // centres des pastilles
  const D = isV ? 210 : 220;
  const centers = isV
    ? [0, 1, 2].map((i) => ({ x: 250, y: 790 + i * 300 }))
    : [0, 1, 2].map((i) => ({ x: W / 2 + (i - 1) * 520, y: 600 }));

  // trajectoire rouge (onde passant par les centres)
  const pathD = isV
    ? `M 250 560 C 170 660, 330 700, 250 790 S 170 980, 250 1090 S 330 1290, 250 1390 S 170 1560, 250 1700`
    : `M -40 640 C 160 560, 300 560, ${centers[0].x} 600 S 700 680, ${centers[1].x} 600 S 1220 520, ${centers[2].x} 600 S 1800 680, 1960 600`;
  const lineP = prog(f, 952, 1004, EASE.inOut);

  const lift = -exit * 50;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: BG.light, opacity: bg }} />
      <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${lift}px)` }}>
        {/* titre */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: isV ? 300 : 190,
            textAlign: "center",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: isV ? 98 : 84,
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ display: isV ? "block" : "inline-block", color: COLORS.ink, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 30}px)` }}>
            Bien équipés.
          </span>
          {isV ? null : " "}
          <span style={{ display: isV ? "block" : "inline-block", color: COLORS.red, opacity: title2In, transform: `translateY(${(1 - title2In) * 30}px)` }}>
            Bien accompagnés.
          </span>
        </div>
        {/* trajectoire */}
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <filter id="s7glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={6} />
            </filter>
          </defs>
          <path d={pathD} fill="none" stroke={RING.base} strokeWidth={10} strokeLinecap="round" opacity={0.22} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lineP} filter="url(#s7glow)" />
          <path d={pathD} fill="none" stroke={RING.base} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lineP} />
        </svg>
        {/* services */}
        {SERVICES.map(({ label, Icon }, i) => {
          const s0 = ev.serviceIcons[i];
          const pop = prog(f, s0 - 4, s0 + 14, EASE.out);
          const draw = prog(f, s0, s0 + 26, EASE.inOut);
          const lab = prog(f, s0 + 8, s0 + 22, EASE.out);
          const c = centers[i];
          const sc = interpolate(pop, [0, 1], [0.7, 1]);
          return (
            <React.Fragment key={label}>
              <div
                style={{
                  position: "absolute",
                  left: c.x - D / 2,
                  top: c.y - D / 2,
                  width: D,
                  height: D,
                  borderRadius: D / 2,
                  background: COLORS.white,
                  boxShadow: "0 18px 40px rgba(20,22,26,0.12), 0 2px 6px rgba(20,22,26,0.08)",
                  border: `2px solid ${COLORS.line}`,
                  opacity: pop,
                  transform: `scale(${sc})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: D * 0.62, height: D * 0.62 }}>
                  <Icon p={draw} />
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  ...(isV
                    ? { left: c.x + D / 2 + 50, top: c.y - 32, textAlign: "left" as const }
                    : { left: c.x - 260, width: 520, top: c.y + D / 2 + 36, textAlign: "center" as const }),
                  fontFamily: FONTS.text,
                  fontWeight: 700,
                  fontSize: isV ? 52 : 44,
                  letterSpacing: "-0.01em",
                  color: COLORS.ink,
                  opacity: lab,
                  transform: `translateY(${(1 - lab) * 18}px)`,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
