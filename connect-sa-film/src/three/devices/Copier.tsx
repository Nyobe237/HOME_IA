/**
 * Copieur multifonction de bureau (sur pied) générique : meuble à trois magasins papier sur roulettes,
 * moteur, bac de sortie intérieur avec feuilles, scanner + chargeur de documents, écran tactile incliné.
 */
import React from "react";
import { Built, Kit, cyl, deg, once, panel, plane, rbox, slab } from "./lib/geo";
import { BuiltMeshes, DeviceRoot, RenderFlags } from "./lib/render";

export const buildCopier = (): Built =>
  once("build:copier", () => {
    const k = new Kit();
    const W = 0.6;
    const D = 0.6;
    const F = D / 2; // face avant

    // roulettes + socle
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        k.add("rubber", cyl(0.018, 0.018, 0.016, 20), [sx * 0.25, 0.018, sz * 0.25], [0, 0, Math.PI / 2]);
        k.add("aluDark", rbox(0.03, 0.02, 0.03, 0.006, 2), [sx * 0.25, 0.04, sz * 0.25]);
      }
    k.add("graphiteDark", rbox(W - 0.01, 0.03, D - 0.01, 0.008, 2), [0, 0.065, 0]);

    // meuble : trois magasins papier
    const y0 = 0.08;
    const dh = 0.118;
    k.add("white", rbox(W, dh * 3, D, 0.01, 3), [0, y0 + (dh * 3) / 2, 0]);
    for (let i = 0; i < 3; i++) {
      const yc = y0 + dh * (i + 0.5);
      k.add("whiteMatte", panel(W - 0.016, dh - 0.008, 0.006, 0.006, 0.0018), [0, yc, F - 0.002]);
      k.add("darkGrey", rbox(0.17, 0.016, 0.014, 0.006, 2), [0, yc + dh * 0.22, F + 0.006]);
      k.add("slot", rbox(0.15, 0.004, 0.004, 0.002, 1), [0, yc + dh * 0.22 - 0.009, F + 0.012]);
      // jauge de papier
      k.add("midGrey", rbox(0.008, 0.03, 0.003, 0.002, 1), [W / 2 - 0.05, yc, F + 0.005]);
    }
    // bandeau sombre de séparation
    k.add("darkGrey", rbox(W + 0.004, 0.016, D + 0.004, 0.005, 2), [0, y0 + dh * 3 + 0.008, 0]);

    // moteur
    const eY0 = y0 + dh * 3 + 0.016;
    const eH = 0.36;
    k.add("white", rbox(W, eH, D, 0.014, 3), [0, eY0 + eH / 2, 0]);
    k.add("lightGrey", panel(W - 0.03, eH - 0.05, 0.006, 0.01, 0.002), [0, eY0 + eH / 2, F - 0.002]);
    k.add("slot", rbox(0.004, eH - 0.08, 0.004, 0.002, 1), [-0.06, eY0 + eH / 2, F + 0.004]);
    k.add("vent", panel(0.2, 0.08, 0.0008, 0.004, 0.0002, { bevelSegs: 1 }), [-W / 2 - 0.0004, eY0 + 0.12, 0.05], [0, -Math.PI / 2, 0]);

    // bac de sortie intérieur (espace ouvert entre moteur et scanner)
    const gY0 = eY0 + eH;
    const gH = 0.1;
    k.add("white", rbox(0.12, gH, D, 0.01, 2), [-W / 2 + 0.06, gY0 + gH / 2, 0]); // colonne gauche
    k.add("white", rbox(W, gH, 0.14, 0.01, 2), [0, gY0 + gH / 2, -F + 0.07]); // fond
    k.add("interior", slab(W - 0.13, D - 0.15, 0.004, 0.006, 0.001), [0.06, gY0, 0.07]);
    k.push([0.07, gY0 + 0.004, 0.07], [0, deg(3), 0]);
    k.add("paper", slab(0.297, 0.21, 0.012, 0.001, 0.0005, { bevelSegs: 1 }), [0, 0, 0]);
    k.add("printSheet", plane(0.297, 0.21), [0, 0.0122, 0], [-Math.PI / 2, 0, Math.PI / 2]);
    k.pop();

    // scanner
    const sY0 = gY0 + gH;
    k.add("white", rbox(W, 0.1, D, 0.012, 3), [0, sY0 + 0.05, 0]);
    k.add("slot", rbox(W - 0.02, 0.004, 0.004, 0.002, 1), [0, sY0 + 0.012, F + 0.001]);
    // chargeur de documents + plateau incliné avec feuilles
    k.add("lightGrey", slab(W - 0.02, D - 0.04, 0.014, 0.01, 0.003), [0, sY0 + 0.1, -0.01]);
    k.add("white", rbox(0.5, 0.075, 0.24, 0.016, 3), [0.02, sY0 + 0.114 + 0.0375, -0.15]);
    k.add("darkGrey", rbox(0.4, 0.01, 0.03, 0.004, 1), [0.02, sY0 + 0.15, -0.025]);
    k.push([0.02, sY0 + 0.2, -0.05], [deg(-12), 0, 0]);
    k.add("graphiteDark", slab(0.36, 0.2, 0.005, 0.01, 0.0015), [0, 0, 0.06]);
    k.add("paper", slab(0.297, 0.18, 0.01, 0.001, 0.0005, { bevelSegs: 1 }), [0, 0.005, 0.07]);
    k.pop();

    // écran tactile incliné (avant droit, sur un bras)
    k.add("darkGrey", rbox(0.06, 0.03, 0.06, 0.008, 2), [0.18, sY0 + 0.03, F + 0.02]);
    k.push([0.15, sY0 + 0.055, F + 0.075], [deg(-38), deg(-8), 0]);
    k.add("graphite", rbox(0.29, 0.018, 0.17, 0.01, 3), [0, 0, 0]);
    k.add("copierUi", plane(0.25, 0.25 * (600 / 1024)), [0, 0.0094, 0], [-Math.PI / 2, 0, 0]);
    k.add("ledWhite", cyl(0.003, 0.003, 0.002, 12), [0.13, 0.0095, 0.07]);
    k.pop();
    return k.build();
  });

export const Copier: React.FC<{ screenOn: number; flags: RenderFlags }> = ({ flags }) => {
  const built = buildCopier();
  return (
    <DeviceRoot offset={built.offset} name="device:copier">
      <BuiltMeshes built={built} flags={flags} />
    </DeviceRoot>
  );
};
