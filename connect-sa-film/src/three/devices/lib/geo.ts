/**
 * Outils géométriques des appareils (procéduraux, déterministes).
 * - `Kit` : assemble des pièces et fusionne toutes celles qui partagent un matériau
 *   (une seule géométrie / un seul appel de rendu par matériau).
 * - Formes : rectangles arrondis extrudés avec biseau arrondi (`slab`, `panel`), boîtes arrondies,
 *   tour, cylindre… toutes avec des normales lissées (toCreasedNormals) pour des reflets propres.
 */
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MatKey } from "./materials";

export type V3 = [number, number, number];

const memo = new Map<string, unknown>();
/** Cache de module (géométries, textures, matériaux partagés entre toutes les instances). */
export const once = <T>(key: string, make: () => T): T => {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as T;
};

const DEG = Math.PI / 180;
export const deg = (d: number) => d * DEG;

/** Rectangle à coins arrondis centré (rayons par coin : [hautGauche, hautDroit, basDroit, basGauche]). */
export const rrShape = (w: number, h: number, r: number | [number, number, number, number]) => {
  const [tl, tr, br, bl] = (typeof r === "number" ? [r, r, r, r] : r).map((v) =>
    Math.max(0, Math.min(v, w / 2 - 1e-6, h / 2 - 1e-6)),
  );
  const x0 = -w / 2;
  const y0 = -h / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + bl, y0);
  s.lineTo(x1 - br, y0);
  if (br > 0) s.absarc(x1 - br, y0 + br, br, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - tr);
  if (tr > 0) s.absarc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2, false);
  s.lineTo(x0 + tl, y1);
  if (tl > 0) s.absarc(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + bl);
  if (bl > 0) s.absarc(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5, false);
  return s;
};

type ExtrudeOpts = { curve?: number; bevelSegs?: number; crease?: number };

/** Extrusion d'une forme sur [0, t] en Z avec biseau arrondi exact (dimensions extérieures respectées). */
const extrudeExact = (shapeAt: (inset: number) => THREE.Shape, t: number, bevel: number, o: ExtrudeOpts = {}) => {
  const b = Math.max(0, Math.min(bevel, t / 2 - 1e-6));
  const g = new THREE.ExtrudeGeometry(shapeAt(b), {
    depth: Math.max(t - 2 * b, 1e-6),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: o.bevelSegs ?? 3,
    curveSegments: o.curve ?? 6,
  });
  g.translate(0, 0, b);
  const out = toCreasedNormals(g, o.crease ?? deg(50));
  g.dispose();
  return out;
};

/** Dalle horizontale : empreinte w (X) x d (Z) centrée, épaisseur t vers +Y (y de 0 à t). */
export const slab = (
  w: number,
  d: number,
  t: number,
  r: number | [number, number, number, number],
  bevel = 0.002,
  o?: ExtrudeOpts,
) => {
  const rr = typeof r === "number" ? ([r, r, r, r] as [number, number, number, number]) : r;
  const g = extrudeExact((b) => rrShape(w - 2 * b, d - 2 * b, rr.map((v) => Math.max(v - b, 1e-4)) as typeof rr), t, bevel, o);
  g.rotateX(-Math.PI / 2); // z(extrusion) -> +y ; y(forme) -> -z
  return g;
};

/** Panneau vertical : w (X) x h (Y) centré, épaisseur t vers +Z (z de 0 à t). */
export const panel = (
  w: number,
  h: number,
  t: number,
  r: number | [number, number, number, number],
  bevel = 0.002,
  o?: ExtrudeOpts,
) => {
  const rr = typeof r === "number" ? ([r, r, r, r] as [number, number, number, number]) : r;
  return extrudeExact((b) => rrShape(w - 2 * b, h - 2 * b, rr.map((v) => Math.max(v - b, 1e-4)) as typeof rr), t, bevel, o);
};

/** Profil quelconque (dans le plan XY) extrudé sur [0, t] en Z, biseau arrondi. */
export const profile = (shape: THREE.Shape, t: number, bevel = 0.002, o?: ExtrudeOpts) =>
  extrudeExact(() => shape, t, bevel, o);

/**
 * Boîte arrondie centrée. Même principe que RoundedBoxGeometry, mais correcte pour toutes les tailles
 * (la version de three r178 calcule les normales comme si la boîte était unitaire : petites boîtes inversées).
 */
export const rbox = (w: number, h: number, d: number, r: number, segs = 3) => {
  const s = segs * 2 + 1;
  const g = new THREE.BoxGeometry(1, 1, 1, s, s, s);
  const rr = Math.max(1e-6, Math.min(r, w / 2, h / 2, d / 2) - 1e-7);
  const b = [w / 2 - rr, h / 2 - rr, d / 2 - rr];
  const half = 0.5 / s;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    n.set(p[0] - Math.sign(p[0]) * half, p[1] - Math.sign(p[1]) * half, p[2] - Math.sign(p[2]) * half).normalize();
    pos.setXYZ(i, b[0] * Math.sign(p[0]) + n.x * rr, b[1] * Math.sign(p[1]) + n.y * rr, b[2] * Math.sign(p[2]) + n.z * rr);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return g;
};

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Cylindre d'axe Y centré. */
export const cyl = (rTop: number, rBot: number, h: number, seg = 32, open = false) =>
  new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);

/** Révolution d'un profil [r, y] autour de Y. */
export const lathe = (pts: Array<[number, number]>, seg = 40) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );

export const torus = (R: number, r: number, radial = 10, tubular = 48, arc = Math.PI * 2) =>
  new THREE.TorusGeometry(R, r, radial, tubular, arc);

export const plane = (w: number, h: number, sx = 1, sy = 1) => new THREE.PlaneGeometry(w, h, sx, sy);

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
export const mat4 = (p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 | number = 1) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    tmpQ.setFromEuler(tmpE.set(r[0], r[1], r[2])),
    typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s),
  );

/** Normalise une géométrie pour la fusion : non indexée, position + normal + uv uniquement. */
const normalize = (geo: THREE.BufferGeometry) => {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
};

export type KeySpec = { x: number; z: number; w: number; d: number };
export type KeyField = {
  keys: KeySpec[];
  /** hauteur de la touche (géométrie), la face supérieure est à y = top */
  h: number;
  top: number;
  radius: number;
  matrix: THREE.Matrix4;
  mat: MatKey;
};

export type Part = { mat: MatKey; geometry: THREE.BufferGeometry; triangles: number };
export type Built = {
  parts: Part[];
  keys: KeyField[];
  /** boîte englobante brute (avant recentrage) */
  bbox: THREE.Box3;
  /** décalage à appliquer pour centrer la boîte en X/Z et poser la base sur y = 0 */
  offset: V3;
  triangles: number;
};

/** Assembleur : pile de transformations + regroupement par matériau. */
export class Kit {
  private groups = new Map<MatKey, THREE.BufferGeometry[]>();
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  private keyFields: KeyField[] = [];

  private get top() {
    return this.stack[this.stack.length - 1];
  }

  push(p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 | number = 1) {
    this.stack.push(this.top.clone().multiply(mat4(p, r, s)));
    return this;
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  /** Ajoute une pièce (la géométrie source n'est pas modifiée). */
  add(mat: MatKey, geo: THREE.BufferGeometry, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 | number = 1) {
    const g = normalize(geo);
    g.applyMatrix4(this.top.clone().multiply(mat4(p, r, s)));
    const list = this.groups.get(mat) ?? [];
    list.push(g);
    this.groups.set(mat, list);
    return this;
  }

  /** Champ de touches instanciées, posé dans le repère courant (touches dans le plan XZ). */
  keys(mat: MatKey, keys: KeySpec[], top: number, h = 0.003, radius = 0.0011) {
    this.keyFields.push({ keys, h, top, radius, mat, matrix: this.top.clone() });
    return this;
  }

  build(): Built {
    const parts: Part[] = [];
    const bbox = new THREE.Box3();
    let triangles = 0;
    for (const [mat, list] of this.groups) {
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error(`fusion impossible (${mat})`);
      list.forEach((g) => g.dispose());
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      bbox.union(merged.boundingBox!);
      const tri = merged.attributes.position.count / 3;
      triangles += tri;
      parts.push({ mat, geometry: merged, triangles: tri });
    }
    const v = new THREE.Vector3();
    for (const f of this.keyFields) {
      for (const k of f.keys) {
        for (const [sx, sz] of [
          [-1, -1],
          [1, 1],
        ]) {
          v.set(k.x + (sx * k.w) / 2, f.top, k.z + (sz * k.d) / 2).applyMatrix4(f.matrix);
          bbox.expandByPoint(v);
        }
      }
      triangles += f.keys.length * KEY_TRIS;
    }
    const c = bbox.getCenter(new THREE.Vector3());
    return { parts, keys: this.keyFields, bbox, offset: [-c.x, -bbox.min.y, -c.z], triangles };
  }
}

/** Triangles d'une touche (RoundedBoxGeometry, 1 segment => grille 3x3 par face). */
export const KEY_TRIS = 6 * 9 * 2;

/** Rangées de clavier : liste de largeurs en unités (u) par rangée -> positions. */
export const keyRows = (
  rows: Array<{ units: number[]; depth?: number; gapAfter?: number }>,
  u: number,
  gap: number,
  rowPitch: number,
): KeySpec[] => {
  const out: KeySpec[] = [];
  const widest = Math.max(...rows.map((r) => r.units.reduce((a, b) => a + b, 0)));
  let z = 0;
  const rowZ: number[] = [];
  rows.forEach((r) => {
    const depth = (r.depth ?? 1) * rowPitch;
    rowZ.push(z + depth / 2);
    z += depth;
  });
  const totalD = z;
  rows.forEach((r, i) => {
    const depth = (r.depth ?? 1) * rowPitch;
    let x = -(widest * u) / 2;
    for (const w of r.units) {
      if (w < 0) {
        x += -w * u; // espace vide
        continue;
      }
      out.push({ x: x + (w * u) / 2, z: rowZ[i] - totalD / 2, w: w * u - gap, d: depth - gap });
      x += w * u;
    }
  });
  return out;
};

/** Met à l'échelle les UV (pour une texture répétée de période `period` mètres). */
export const uvTile = (geo: THREE.BufferGeometry, w: number, h: number, period: number) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / period, (uv.getY(i) * h) / period);
  uv.needsUpdate = true;
  return geo;
};
