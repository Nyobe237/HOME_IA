/**
 * Imprimante multifonction de bureau générique : corps graphite, scanner + chargeur de documents,
 * panneau de commande incliné avec petit écran, bac de sortie avec feuille imprimée, cassette papier.
 */
import React from "react";
import { Built, Kit, cyl, deg, once, panel, plane, rbox, slab } from "./lib/geo";
import { BuiltMeshes, DeviceRoot, RenderFlags } from "./lib/render";

export const buildPrinter = (): Built =>
  once("build:printer", () => {
    const k = new Kit();
    const W = 0.42;
    const D = 0.36;
    const front = D / 2;

    // corps principal (moteur d'impression)
    k.add("graphite", rbox(W, 0.158, D, 0.014, 3), [0, 0.079 + 0.006, 0]);
    // cassette papier (bas, légèrement en saillie) + poignée
    k.add("darkGrey", rbox(W - 0.03, 0.052, 0.012, 0.004, 2), [0, 0.04, front + 0.002]);
    k.add("slot", rbox(0.09, 0.008, 0.004, 0.003, 1), [0, 0.054, front + 0.008]);
    // fente de sortie
    k.add("slot", rbox(W - 0.1, 0.022, 0.03, 0.006, 2), [0, 0.112, front - 0.008]);
    // bac de sortie déplié + feuille imprimée
    k.add("graphiteDark", slab(0.3, 0.13, 0.004, [0.004, 0.004, 0.012, 0.012], 0.0012), [0, 0.098, front + 0.05], [deg(4), 0, 0]);
    k.push([0, 0.1035, front + 0.035], [deg(4) - Math.PI / 2, 0, 0]);
    k.add("printSheet", plane(0.21, 0.297 * 0.5), [0, 0, 0]);
    k.pop();
    // joint corps / scanner
    k.add("slot", rbox(W - 0.004, 0.004, D - 0.004, 0.002, 1), [0, 0.165, 0]);
    // unité de numérisation
    k.add("graphite", rbox(W, 0.05, D - 0.012, 0.012, 3), [0, 0.193, -0.004]);
    // capot du scanner (dalle claire mate) + chargeur de documents
    k.add("darkGrey", slab(W - 0.012, D - 0.03, 0.012, 0.01, 0.003), [0, 0.217, -0.01]);
    k.add("graphite", rbox(0.3, 0.032, 0.11, 0.01, 3), [0.03, 0.245, -0.11]);
    k.add("slot", rbox(0.25, 0.006, 0.02, 0.003, 1), [0.03, 0.247, -0.05]);
    // plateau d'alimentation incliné avec feuilles
    k.push([0.03, 0.262, -0.07], [deg(-14), 0, 0]);
    k.add("graphiteDark", slab(0.26, 0.11, 0.004, 0.008, 0.0012), [0, 0, -0.05]);
    k.add("paper", slab(0.21, 0.1, 0.006, 0.001, 0.0005, { bevelSegs: 1 }), [0, 0.004, -0.05]);
    k.pop();
    // panneau de commande incliné (avant gauche)
    k.push([-0.075, 0.176, front + 0.012], [deg(-32), 0, 0]);
    k.add("glossBlack", rbox(0.23, 0.012, 0.07, 0.006, 3), [0, 0, 0]);
    k.add("lcd", plane(0.074, 0.046), [-0.055, 0.0062, 0], [-Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) k.add("midGrey", cyl(0.006, 0.006, 0.003, 20), [0.03 + i * 0.022, 0.006, 0.006]);
    k.add("chrome", cyl(0.008, 0.008, 0.003, 24), [0.1, 0.006, -0.012]);
    k.add("ledWhite", cyl(0.002, 0.002, 0.002, 12), [0.1, 0.0075, 0.018]);
    k.pop();
    // pieds
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add("rubber", cyl(0.01, 0.01, 0.006, 16), [sx * 0.17, 0.003, sz * 0.14]);
    // grille latérale
    k.add("vent", panel(0.18, 0.05, 0.0008, 0.004, 0.0002, { bevelSegs: 1 }), [W / 2 + 0.0004, 0.09, 0], [0, Math.PI / 2, 0]);
    return k.build();
  });

export const Printer: React.FC<{ screenOn: number; flags: RenderFlags }> = ({ flags }) => {
  const built = buildPrinter();
  return (
    <DeviceRoot offset={built.offset} name="device:printer">
      <BuiltMeshes built={built} flags={flags} />
    </DeviceRoot>
  );
};
