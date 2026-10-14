/**
 * Pièces réutilisées par plusieurs appareils : dispositions de clavier, clavier biseauté, souris.
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Kit, KeySpec, cyl, keyRows, once, slab } from "./geo";
import type { MatKey } from "./materials";

/** Ajoute un T inversé de flèches dans un espace de 3 u réservé à droite de la dernière rangée. */
const addArrows = (keys: KeySpec[], zRow: number, xStart: number, u: number, gap: number) => {
  const hd = (u - gap) / 2 - gap / 4;
  const up = zRow - hd / 2 - gap / 4;
  const down = zRow + hd / 2 + gap / 4;
  keys.push({ x: xStart + 0.5 * u, z: down, w: u - gap, d: hd });
  keys.push({ x: xStart + 1.5 * u, z: up, w: u - gap, d: hd });
  keys.push({ x: xStart + 1.5 * u, z: down, w: u - gap, d: hd });
  keys.push({ x: xStart + 2.5 * u, z: down, w: u - gap, d: hd });
};

/** Clavier compact (portable) : 14,5 u de large, 5,55 rangées. */
export const compactLayout = (u: number, gap: number): KeySpec[] => {
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
    u,
  );
  addArrows(keys, keys[keys.length - 1].z, (14.5 * u) / 2 - 3 * u, u, gap);
  return keys;
};

/** Clavier complet extra-plat : bloc principal 14,5 u + pavé numérique 4 u (écart 0,6 u). */
export const fullLayout = (u: number, gap: number): KeySpec[] => {
  const sp = -0.6;
  const keys = keyRows(
    [
      { units: [...Array(14).fill(14.5 / 14), sp, 1, 1, 1, 1], depth: 0.55 },
      { units: [...Array(13).fill(1), 1.5, sp, 1, 1, 1, 1] },
      { units: [1.5, ...Array(13).fill(1), sp, 1, 1, 1, 1] },
      { units: [1.75, ...Array(11).fill(1), 1.75, sp, 1, 1, 1, 1] },
      { units: [2.25, ...Array(10).fill(1), 2.25, sp, 1, 1, 1, 1] },
      { units: [1, 1, 1, 1.25, 5, 1.25, 1, -3, sp, 2, 1, 1] },
    ],
    u,
    gap,
    u,
  );
  const total = 14.5 + 0.6 + 4;
  const zRow = keys[keys.length - 1].z;
  addArrows(keys, zRow, -(total * u) / 2 + 11.5 * u, u, gap);
  return keys;
};

/** Amincit une dalle vers l'avant (+Z) : épaisseur arrière conservée, avant = ratio. */
export const taper = (geo: THREE.BufferGeometry, depth: number, ratio: number) => {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getZ(i) + depth / 2) / depth, 0, 1); // 0 arrière -> 1 avant
    p.setY(i, p.getY(i) * (1 - (1 - ratio) * t));
  }
  p.needsUpdate = true;
  geo.computeBoundingBox();
  return geo;
};

/** Clavier extra-plat (coque + touches instanciées), posé à l'origine du repère courant. */
export const addKeyboard = (
  k: Kit,
  o: { layout: KeySpec[]; u: number; margin: number; back: number; front: number; body: MatKey; keyMat: MatKey },
) => {
  const xs = o.layout.map((q) => [q.x - q.w / 2, q.x + q.w / 2]).flat();
  const zs = o.layout.map((q) => [q.z - q.d / 2, q.z + q.d / 2]).flat();
  const w = Math.max(...xs) - Math.min(...xs) + 2 * o.margin;
  const d = Math.max(...zs) - Math.min(...zs) + 2 * o.margin;
  const body = taper(slab(w, d, o.back, 0.008, 0.0022, { curve: 6, bevelSegs: 2 }), d, o.front / o.back);
  k.add(o.body, body);
  // pieds arrière (caoutchouc)
  for (const sx of [-1, 1]) k.add("rubber", cyl(0.004, 0.004, 0.002, 12), [sx * (w / 2 - 0.02), -0.0008, -d / 2 + 0.012]);
  const slope = Math.atan((o.back - o.front) / d);
  k.push([0, (o.back + o.front) / 2, 0], [slope, 0, 0]).keys(o.keyMat, o.layout, 0.0014, 0.003, 0.0011).pop();
  return { w, d };
};

/**
 * Souris : dôme asymétrique (point haut vers l'arrière), base plate.
 * Dimensions : largeur w, hauteur h, longueur l ; origine au centre de la base.
 */
export const mouseGeo = (w: number, h: number, l: number) =>
  once(`mouse:${w}:${h}:${l}`, () => {
    const prof: Array<[number, number]> = [
      [0.0001, 1.0],
      [0.22, 0.975],
      [0.44, 0.9],
      [0.63, 0.78],
      [0.79, 0.62],
      [0.9, 0.44],
      [0.97, 0.26],
      [1.0, 0.12],
      [0.995, 0.04],
      [0.96, 0.0],
      [0.0001, 0.0],
    ];
    const lat = new THREE.LatheGeometry(
      prof.map(([r, y]) => new THREE.Vector2(r, y)),
      44,
    );
    lat.deleteAttribute("uv");
    lat.deleteAttribute("normal");
    const g = mergeVertices(lat, 1e-5);
    lat.dispose();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * (w / 2);
      const z = p.getZ(i) * (l / 2);
      const zn = z / (l / 2); // -1 arrière, +1 avant
      // dos plus haut à l'arrière, avant plus bas ; flancs légèrement pincés à l'avant
      const y = p.getY(i) * h * (1 - 0.2 * Math.max(0, zn) - 0.06 * Math.max(0, -zn));
      p.setXYZ(i, x * (1 - 0.1 * Math.max(0, zn)), y, z);
    }
    g.computeVertexNormals();
    return g;
  });
