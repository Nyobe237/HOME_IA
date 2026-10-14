/**
 * Accessoires génériques : casque audio, souris sans fil, clé USB et disque SSD externe.
 */
import React from "react";
import { Built, Kit, cyl, deg, once, rbox, torus } from "./lib/geo";
import { mouseGeo } from "./lib/parts";
import { BuiltMeshes, DeviceRoot, RenderFlags } from "./lib/render";

export const buildAccessories = (): Built =>
  once("build:accessories", () => {
    const k = new Kit();
    // casque (debout, vu de face, légèrement tourné)
    k.push([-0.11, 0, -0.04], [0, deg(18), 0]);
    {
      const R = 0.088;
      const cupY = 0.06;
      k.add("satinBlack", torus(R, 0.0085, 12, 64, Math.PI), [0, cupY + 0.03, 0]);
      k.add("leather", torus(R - 0.006, 0.007, 10, 56, Math.PI * 0.7), [0, cupY + 0.03, 0], [0, 0, Math.PI * 0.15]);
      for (const sx of [-1, 1]) {
        k.add("aluDark", rbox(0.012, 0.05, 0.016, 0.004, 2), [sx * R, cupY + 0.02, 0]);
        k.add("satinBlack", cyl(0.043, 0.043, 0.026, 40), [sx * (R + 0.004), cupY - 0.012, 0], [0, 0, Math.PI / 2]);
        k.add("leather", cyl(0.039, 0.039, 0.018, 40), [sx * (R - 0.016), cupY - 0.012, 0], [0, 0, Math.PI / 2]);
        k.add("red", cyl(0.012, 0.012, 0.002, 24), [sx * (R + 0.018), cupY - 0.012, 0], [0, 0, Math.PI / 2]);
      }
    }
    k.pop();
    // souris sans fil (avant droit)
    k.add("white", mouseGeo(0.06, 0.035, 0.108), [0.13, 0, 0.06], [0, deg(-14), 0]);
    k.add("graphiteDark", cyl(0.004, 0.004, 0.006, 16), [0.124, 0.0325, 0.038], [0, deg(-14), Math.PI / 2]);
    // disque SSD externe (arrière droit)
    k.add("aluDark", rbox(0.075, 0.011, 0.105, 0.008, 3), [0.17, 0.0055, -0.08], [0, deg(10), 0]);
    k.add("ledWhite", rbox(0.012, 0.0012, 0.0015, 0.0005, 1), [0.17, 0.008, -0.026], [0, deg(10), 0]);
    // clé USB (avant gauche)
    k.push([-0.03, 0, 0.09], [0, deg(24), 0]);
    k.add("satinBlack", rbox(0.052, 0.009, 0.02, 0.004, 2), [0, 0.0045, 0]);
    k.add("chrome", rbox(0.014, 0.0045, 0.012, 0.0006, 1), [0.032, 0.0045, 0]);
    k.add("red", rbox(0.006, 0.0094, 0.0205, 0.002, 1), [-0.022, 0.0045, 0]);
    k.pop();
    return k.build();
  });

export const Accessories: React.FC<{ screenOn: number; flags: RenderFlags }> = ({ flags }) => {
  const built = buildAccessories();
  return (
    <DeviceRoot offset={built.offset} name="device:accessories">
      <BuiltMeshes built={built} flags={flags} />
    </DeviceRoot>
  );
};
