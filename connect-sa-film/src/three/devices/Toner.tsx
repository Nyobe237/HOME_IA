/**
 * Consommables génériques : une cartouche de toner laser couchée (poignée nervurée) devant
 * quatre flacons de toner aux bouchons cyan, magenta, jaune et noir. Aucune marque.
 */
import React from "react";
import { Built, Kit, cyl, deg, lathe, once, rbox } from "./lib/geo";
import { BuiltMeshes, DeviceRoot, RenderFlags } from "./lib/render";
import type { MatKey } from "./lib/materials";

export const buildToner = (): Built =>
  once("build:toner", () => {
    const k = new Kit();
    // flacons (arrière)
    const caps: MatKey[] = ["cyan", "magenta", "yellow", "black"];
    const body = lathe(
      [
        [0.0001, 0],
        [0.027, 0],
        [0.03, 0.006],
        [0.03, 0.105],
        [0.027, 0.118],
        [0.016, 0.126],
        [0.0001, 0.126],
      ],
      40,
    );
    caps.forEach((c, i) => {
      const x = -0.135 + i * 0.09;
      const z = -0.045;
      k.add("graphiteDark", body, [x, 0, z]);
      k.add(c, cyl(0.0175, 0.0175, 0.022, 32), [x, 0.137, z]);
      k.add(c, cyl(0.0302, 0.0302, 0.028, 40, true), [x, 0.06, z]); // bande de couleur
      k.add("white", cyl(0.0303, 0.0303, 0.018, 40, true), [x, 0.06, z]); // étiquette
    });
    // cartouche couchée (avant)
    k.push([0, 0, 0.06], [0, deg(-6), 0]);
    k.add("black", rbox(0.34, 0.07, 0.082, 0.022, 4), [0, 0.035, 0]);
    k.add("graphite", rbox(0.06, 0.074, 0.086, 0.02, 3), [0.15, 0.037, 0]);
    for (let i = 0; i < 6; i++) k.add("graphiteDark", rbox(0.004, 0.06, 0.088, 0.002, 1), [0.128 + i * 0.008, 0.037, 0]);
    k.add("lightGrey", rbox(0.12, 0.002, 0.05, 0.001, 1), [-0.04, 0.0705, 0]);
    k.add("midGrey", rbox(0.024, 0.05, 0.05, 0.008, 2), [-0.175, 0.035, 0]);
    k.pop();
    return k.build();
  });

export const Toner: React.FC<{ screenOn: number; flags: RenderFlags }> = ({ flags }) => {
  const built = buildToner();
  return (
    <DeviceRoot offset={built.offset} name="device:toner">
      <BuiltMeshes built={built} flags={flags} />
    </DeviceRoot>
  );
};
