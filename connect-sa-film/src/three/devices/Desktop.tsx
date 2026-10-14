/**
 * Poste de bureau générique : écran 24" (bordures fines, pied aluminium), tour noire satinée,
 * clavier complet extra-plat et souris. Fond d'écran CONNECT émissif (16:9).
 */
import React from "react";
import { Built, Kit, cyl, deg, once, panel, plane, rbox, slab } from "./lib/geo";
import { addKeyboard, fullLayout, mouseGeo } from "./lib/parts";
import { BuiltMeshes, DeviceRoot, RenderFlags, useEmissiveScreen, useScreenTexture } from "./lib/render";

export const buildDesktop = (): Built =>
  once("build:desktop", () => {
    const k = new Kit();

    // ---------------- écran (centré en x = 0, face avant vers +Z)
    const PW = 0.545; // largeur du panneau
    const PH = 0.322; // hauteur du panneau
    const PT = 0.011; // épaisseur du panneau
    const yBottom = 0.118; // bas du panneau
    const zPanel = -0.07; // face arrière du panneau
    const cy = yBottom + PH / 2;
    // coque arrière (bosse) + panneau
    k.add("graphite", rbox(0.32, 0.2, 0.034, 0.012, 3), [0, cy + 0.01, zPanel - 0.016]);
    k.add("satinBlack", panel(PW, PH, PT, 0.006, 0.0018, { curve: 6 }), [0, cy, zPanel]);
    // verre noir (bordure) + menton légèrement plus épais
    k.add("glass", panel(PW - 0.004, PH - 0.004, 0.0008, 0.005, 0.0003, { bevelSegs: 2 }), [0, cy, zPanel + PT - 0.0002]);
    k.add("graphite", panel(PW - 0.004, 0.017, 0.0012, [0, 0, 0.005, 0.005], 0.0004, { bevelSegs: 1 }), [0, yBottom + 0.0105, zPanel + PT]);
    const sw = 0.527;
    const sh = sw * (9 / 16);
    k.add("screen", plane(sw, sh), [0, yBottom + 0.019 + sh / 2, zPanel + PT + 0.0008]);
    k.add("ledWhite", rbox(0.004, 0.0012, 0.001, 0.0005, 1), [0.22, yBottom + 0.0095, zPanel + PT + 0.0012]);

    // pied : col incliné + socle aluminium
    k.add("alu", rbox(0.052, 0.2, 0.016, 0.006, 3), [0, 0.105, zPanel - 0.05], [deg(-9), 0, 0]);
    k.add("alu", slab(0.235, 0.165, 0.009, 0.03, 0.003, { curve: 8 }), [0, 0, zPanel - 0.045]);
    k.add("aluDark", rbox(0.06, 0.008, 0.03, 0.003, 2), [0, 0.012, zPanel - 0.06]);

    // ---------------- tour (à droite, en retrait)
    const tw = 0.172;
    const th = 0.39;
    const td = 0.36;
    const tx = 0.43;
    const tz = -0.12;
    k.add("satinBlack", rbox(tw, th, td, 0.01, 3), [tx, th / 2 + 0.012, tz]);
    // façade brillante, grille d'aération, bouton, voyant rouge discret
    k.add("glossBlack", panel(tw - 0.012, th - 0.014, 0.004, 0.006, 0.0012), [tx, th / 2 + 0.012, tz + td / 2 - 0.0005]);
    k.add("vent", panel(tw - 0.05, 0.16, 0.0008, 0.004, 0.0002, { bevelSegs: 1 }), [tx, 0.13, tz + td / 2 + 0.0038]);
    k.add("chrome", cyl(0.011, 0.011, 0.003, 32), [tx, th - 0.03, tz + td / 2 + 0.004], [Math.PI / 2, 0, 0]);
    k.add("ledRed", rbox(0.0026, 0.11, 0.001, 0.0011, 1), [tx - tw / 2 + 0.016, th - 0.12, tz + td / 2 + 0.0039]);
    k.add("slot", rbox(0.03, 0.006, 0.002, 0.002, 1), [tx + 0.03, th - 0.03, tz + td / 2 + 0.0038]);
    k.add("slot", rbox(0.03, 0.006, 0.002, 0.002, 1), [tx + 0.03, th - 0.045, tz + td / 2 + 0.0038]);
    // pieds de la tour
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add("rubber", cyl(0.012, 0.012, 0.012, 16), [tx + sx * 0.06, 0.006, tz + sz * 0.15]);

    // ---------------- clavier + souris (devant)
    const u = 0.0172;
    k.push([-0.02, 0, 0.14]);
    addKeyboard(k, { layout: fullLayout(u, 0.0029), u, margin: 0.009, back: 0.016, front: 0.008, body: "aluSoft", keyMat: "keycap" });
    k.pop();
    k.add("satinBlack", mouseGeo(0.062, 0.036, 0.112), [0.29, 0, 0.16], [0, deg(-8), 0]);
    k.add("graphiteDark", cyl(0.0042, 0.0042, 0.006, 16), [0.2897, 0.0335, 0.137], [0, 0, Math.PI / 2]);
    return k.build();
  });

export const Desktop: React.FC<{ screenOn: number; flags: RenderFlags }> = ({ screenOn, flags }) => {
  const built = buildDesktop();
  const tex = useScreenTexture("assets/screen_wallpaper_16x9.png");
  const screen = useEmissiveScreen(tex, screenOn);
  return (
    <DeviceRoot offset={built.offset} name="device:desktop">
      <BuiltMeshes built={built} flags={flags} overrides={{ screen }} />
    </DeviceRoot>
  );
};
