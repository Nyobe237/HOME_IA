/**
 * Ordinateur portable 14" générique : base aluminium, clavier rétroéclairé sombre (touches instanciées),
 * pavé tactile, charnière, écran ouvert à 108°, bordure noire fine, fond d'écran CONNECT émissif.
 */
import React from "react";
import { Built, Kit, KeySpec, V3, cyl, deg, keyRows, once, panel, plane, rbox, slab } from "./lib/geo";
import { BuiltMeshes, DeviceRoot, RenderFlags, useEmissiveScreen, useScreenTexture } from "./lib/render";

export const LAPTOP = {
  W: 0.32,
  D: 0.226,
  T: 0.0155,
  L: 0.214, // hauteur du capot
  lidT: 0.0062,
  openDeg: 108,
};

/** Rangées d'un clavier de portable 14" (14,5 u par rangée). */
export const laptopKeys = (u: number, gap: number): KeySpec[] => {
  const rowPitch = u;
  const keys = keyRows(
    [
      { units: Array(14).fill(14.5 / 14), depth: 0.55 },
      { units: [...Array(13).fill(1), 1.5] },
      { units: [1.5, ...Array(13).fill(1)] },
      { units: [1.75, ...Array(11).fill(1), 1.75] },
      { units: [2.25, ...Array(10).fill(1), 2.25] },
      { units: [1, 1, 1, 1.25, 5, 1.25, 1, -3] },
    ],
    u,
    gap,
    rowPitch,
  );
  // flèches en T inversé dans l'espace réservé (3 u) de la dernière rangée
  const last = keys[keys.length - 1];
  const zRow = last.z;
  const xStart = (14.5 * u) / 2 - 3 * u;
  const hd = (rowPitch - gap) / 2 - gap / 4;
  keys.push({ x: xStart + 0.5 * u, z: zRow + hd / 2 + gap / 4, w: u - gap, d: hd });
  keys.push({ x: xStart + 1.5 * u, z: zRow - hd / 2 - gap / 4, w: u - gap, d: hd });
  keys.push({ x: xStart + 1.5 * u, z: zRow + hd / 2 + gap / 4, w: u - gap, d: hd });
  keys.push({ x: xStart + 2.5 * u, z: zRow + hd / 2 + gap / 4, w: u - gap, d: hd });
  return keys;
};

export const buildLaptop = (): Built =>
  once("build:laptop", () => {
    const { W, D, T, L, lidT, openDeg } = LAPTOP;
    const k = new Kit();
    const zBack = -D / 2;

    // --- base (légèrement plus fine à l'avant : deux dalles superposées)
    k.add("alu", slab(W, D, T, 0.011, 0.0028, { curve: 8, bevelSegs: 3 }));
    // pieds caoutchouc (dessous, invisibles sauf de très bas)
    for (const [x, z] of [
      [-0.13, -0.085],
      [0.13, -0.085],
      [-0.13, 0.09],
      [0.13, 0.09],
    ])
      k.add("rubber", cyl(0.006, 0.006, 0.0015, 16), [x, -0.0004, z]);

    // --- plateau clavier (évidement sombre) + touches
    const u = 0.0186;
    const gap = 0.0032;
    const keys = laptopKeys(u, gap);
    const deckW = 14.5 * u + 0.0045;
    const deckD = (5 + 0.55) * u + 0.0045;
    const deckZ = zBack + 0.017 + deckD / 2;
    k.add("keyDeck", slab(deckW, deckD, 0.0006, 0.003, 0.0002, { bevelSegs: 1 }), [0, T - 0.0003, deckZ]);
    k.push([0, 0, deckZ]).keys("keycap", keys, T + 0.0011, 0.003, 0.0011).pop();

    // grilles de haut-parleurs (micro-perforations suggérées par une bande sombre fine)
    for (const sx of [-1, 1]) {
      k.add("keyDeck", slab(0.009, deckD * 0.86, 0.0004, 0.002, 0.0001, { bevelSegs: 1 }), [sx * (deckW / 2 + 0.0085), T - 0.0002, deckZ]);
    }

    // --- pavé tactile
    const tpW = 0.114;
    const tpD = 0.071;
    const tpZ = D / 2 - 0.016 - tpD / 2;
    k.add("trackpad", slab(tpW, tpD, 0.0005, 0.0045, 0.00025, { bevelSegs: 2 }), [0, T - 0.0002, tpZ]);
    // encoche avant
    k.add("aluDark", slab(0.06, 0.004, 0.0004, 0.0018, 0.0001, { bevelSegs: 1 }), [0, T - 0.0002, D / 2 - 0.0025]);

    // --- ports (côtés)
    const port = (x: number, z: number, w: number, h: number) =>
      k.add("slot", rbox(0.0016, h, w, Math.min(h, w) * 0.45, 2), [x, T * 0.5, z]);
    port(-W / 2 + 0.0004, -0.045, 0.0085, 0.0032);
    port(-W / 2 + 0.0004, -0.03, 0.0085, 0.0032);
    port(-W / 2 + 0.0004, -0.008, 0.014, 0.0055);
    port(W / 2 - 0.0004, -0.04, 0.012, 0.0048);
    k.add("slot", cyl(0.0019, 0.0019, 0.0016, 16), [W / 2 - 0.0004, T * 0.5, -0.018], [0, 0, Math.PI / 2]);
    k.add("ledWhite", rbox(0.0012, 0.0012, 0.0035, 0.0005, 1), [-W / 2 + 0.0003, T * 0.5, 0.03]);

    // --- charnière
    const pivot: V3 = [0, T * 0.62, zBack + 0.0016];
    k.add("aluDark", cyl(0.0052, 0.0052, W - 0.07, 24), pivot, [0, 0, Math.PI / 2]);

    // --- capot (repère local : bas du capot sur la charnière, écran vers +Z)
    k.push(pivot, [-deg(openDeg - 90), 0, 0]);
    {
      const lidW = W - 0.001;
      // coque aluminium (dos), épaisseur vers -Z
      k.add("alu", panel(lidW, L, lidT, [0.011, 0.011, 0.004, 0.004], 0.002, { curve: 8 }), [0, L / 2 + 0.0015, -lidT]);
      // dalle de verre noire (bordure)
      const bezW = lidW - 0.0034;
      const bezH = L - 0.0034;
      k.add("glass", panel(bezW, bezH, 0.0008, [0.0095, 0.0095, 0.003, 0.003], 0.0003, { curve: 8, bevelSegs: 2 }), [
        0,
        L / 2 + 0.0015,
        -0.0004,
      ]);
      // zone active 16:10
      const sw = 0.2965;
      const sh = sw / 1.6;
      const top = L + 0.0015 - 0.0017 - 0.0075;
      k.add("screen", plane(sw, sh), [0, top - sh / 2, 0.00045]);
      // caméra
      k.add("slot", cyl(0.0012, 0.0012, 0.0004, 16), [0, top + 0.0042, 0.0003], [Math.PI / 2, 0, 0]);
    }
    k.pop();
    return k.build();
  });

export const Laptop: React.FC<{ screenOn: number; flags: RenderFlags }> = ({ screenOn, flags }) => {
  const built = buildLaptop();
  const tex = useScreenTexture("assets/screen_wallpaper_16x10.png");
  const screen = useEmissiveScreen(tex, screenOn);
  return (
    <DeviceRoot offset={built.offset} name="device:laptop">
      <BuiltMeshes built={built} flags={flags} overrides={{ screen }} />
    </DeviceRoot>
  );
};
