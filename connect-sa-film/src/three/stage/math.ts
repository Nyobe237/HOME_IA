/**
 * Outils mathématiques du studio 3D : rig caméra (avec décentrement optique), splines de clés,
 * et résolution du raccord S3 -> S4 (anneau 3D dont l'image coïncide avec l'ellipse 2D à l'image 342).
 * Tout est déterministe (aucun aléa, aucune horloge).
 */
import * as THREE from "three";

export type V3 = [number, number, number];

export const D2R = Math.PI / 180;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/* ------------------------------------------------------------------ */
/* Rig caméra : cible, distance, élévation, azimut, focale, décentrement */
/* ------------------------------------------------------------------ */

export type CamRig = {
  target: V3;
  dist: number;
  /** élévation (degrés) au-dessus de l'horizontale */
  el: number;
  /** azimut (degrés), 0 = caméra sur +Z */
  az: number;
  /** champ vertical (degrés) */
  fov: number;
  /** décentrement optique en px écran (x vers la droite, y vers le bas) : la cible apparaît en (W/2+sx, H/2+sy) */
  shift: [number, number];
};

export const rigToArray = (r: CamRig) => [...r.target, r.dist, r.el, r.az, r.fov, r.shift[0], r.shift[1]];
export const rigFromArray = (a: number[]): CamRig => ({
  target: [a[0], a[1], a[2]],
  dist: a[3],
  el: a[4],
  az: a[5],
  fov: a[6],
  shift: [a[7], a[8]],
});

export const rigPosition = (r: CamRig): V3 => {
  const el = r.el * D2R;
  const az = r.az * D2R;
  return [
    r.target[0] + r.dist * Math.sin(az) * Math.cos(el),
    r.target[1] + r.dist * Math.sin(el),
    r.target[2] + r.dist * Math.cos(az) * Math.cos(el),
  ];
};

export const applyRig = (cam: THREE.PerspectiveCamera, r: CamRig, W: number, H: number) => {
  const p = rigPosition(r);
  cam.fov = r.fov;
  cam.aspect = W / H;
  cam.near = 0.1;
  cam.far = 80;
  cam.position.set(p[0], p[1], p[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(r.target[0], r.target[1], r.target[2]);
  cam.setViewOffset(W, H, -r.shift[0], -r.shift[1], W, H);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};

/* ------------------------------------------------------------------ */
/* Splines de clés (Hermite, tangentes Catmull-Rom non uniformes)      */
/* ------------------------------------------------------------------ */

export type Key = { f: number; v: number[] };

/**
 * Interpolation C1 entre clés (images absolues). Tangente nulle aux extrémités
 * et sur les clés marquées en doublon (maintien).
 */
export const spline = (keys: Key[], frame: number): number[] => {
  const n = keys.length;
  if (frame <= keys[0].f) return keys[0].v.slice();
  if (frame >= keys[n - 1].f) return keys[n - 1].v.slice();
  let i = 0;
  while (i < n - 2 && frame > keys[i + 1].f) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const dt = k1.f - k0.f;
  const t = (frame - k0.f) / dt;
  const tangent = (j: number, d: number) => {
    if (j <= 0 || j >= n - 1) return 0;
    const a = keys[j - 1];
    const b = keys[j + 1];
    const c = keys[j];
    // maintien explicite : clé identique à sa voisine -> tangente nulle
    if (a.v[d] === c.v[d] || b.v[d] === c.v[d]) return 0;
    // évite les dépassements : tangente nulle sur un extremum local
    if ((c.v[d] - a.v[d]) * (b.v[d] - c.v[d]) <= 0) return 0;
    return (b.v[d] - a.v[d]) / (b.f - a.f);
  };
  const h00 = 2 * t * t * t - 3 * t * t + 1;
  const h10 = t * t * t - 2 * t * t + t;
  const h01 = -2 * t * t * t + 3 * t * t;
  const h11 = t * t * t - t * t;
  return k0.v.map((v0, d) => {
    const v1 = k1.v[d];
    const m0 = tangent(i, d) * dt;
    const m1 = tangent(i + 1, d) * dt;
    return h00 * v0 + h10 * m0 + h01 * v1 + h11 * m1;
  });
};

export const rigSpline = (keys: { f: number; rig: CamRig }[], frame: number): CamRig =>
  rigFromArray(spline(keys.map((k) => ({ f: k.f, v: rigToArray(k.rig) })), frame));

/* ------------------------------------------------------------------ */
/* Anneau : ellipse dans un plan quelconque                            */
/* ------------------------------------------------------------------ */

export type RingPose = {
  center: V3;
  /** orientation du repère local (X = demi-axe a1, Y = normale du plan, Z = demi-axe a2) */
  quat: [number, number, number, number];
  a1: number;
  a2: number;
};

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();

/** Point de l'anneau dans la direction d'azimut monde phi (0 = vers +Z, 90° = vers +X). */
export const ringPoint = (pose: RingPose, phiDeg: number): V3 => {
  _q.set(...pose.quat);
  _e1.set(1, 0, 0).applyQuaternion(_q);
  _e2.set(0, 0, 1).applyQuaternion(_q);
  const phi = phiDeg * D2R;
  _v.set(Math.sin(phi), 0, Math.cos(phi));
  const th = Math.atan2(_v.dot(_e2) / pose.a2, _v.dot(_e1) / pose.a1);
  return [
    pose.center[0] + _e1.x * pose.a1 * Math.cos(th) + _e2.x * pose.a2 * Math.sin(th),
    pose.center[1] + _e1.y * pose.a1 * Math.cos(th) + _e2.y * pose.a2 * Math.sin(th),
    pose.center[2] + _e1.z * pose.a1 * Math.cos(th) + _e2.z * pose.a2 * Math.sin(th),
  ];
};

export const lerpPose = (a: RingPose, b: RingPose, t: number): RingPose => {
  const qa = new THREE.Quaternion(...a.quat);
  const qb = new THREE.Quaternion(...b.quat);
  qa.slerp(qb, t);
  return {
    center: lerp3(a.center, b.center, t),
    quat: [qa.x, qa.y, qa.z, qa.w],
    a1: lerp(a.a1, b.a1, t),
    a2: lerp(a.a2, b.a2, t),
  };
};

export const flatPose = (center: V3, r1: number, r2 = r1): RingPose => ({ center, quat: [0, 0, 0, 1], a1: r1, a2: r2 });

/* ------------------------------------------------------------------ */
/* Raccord : rétro-projection de l'ellipse 2D cible sur le plan incliné */
/* ------------------------------------------------------------------ */

export type SeamEllipse = { cx: number; cy: number; rx: number; ry: number; rotationDeg: number };

/** Point de l'ellipse 2D (convention SVG : rotate(rotationDeg cx cy), y vers le bas). */
export const seamPoint = (s: SeamEllipse, t: number): [number, number] => {
  const r = s.rotationDeg * D2R;
  const ex = s.rx * Math.cos(t);
  const ey = s.ry * Math.sin(t);
  return [s.cx + ex * Math.cos(r) - ey * Math.sin(r), s.cy + ex * Math.sin(r) + ey * Math.cos(r)];
};

export const makeCamera = (rig: CamRig, W: number, H: number) => {
  const cam = new THREE.PerspectiveCamera();
  applyRig(cam, rig, W, H);
  return cam;
};

/** Projette un point monde en px écran pour un rig donné. */
export const projectPx = (cam: THREE.PerspectiveCamera, p: V3, W: number, H: number): [number, number, number] => {
  const v = new THREE.Vector3(...p).project(cam);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H, v.z];
};

/** Résout l'ellipse 3D (dans le plan donné) dont l'image par la caméra est exactement l'ellipse 2D cible. */
export const solveSeamRing = (
  seam: SeamEllipse,
  rig: CamRig,
  W: number,
  H: number,
  plane: { point: V3; tiltXDeg: number; tiltZDeg: number },
): RingPose => {
  const cam = makeCamera(rig, W, H);
  const n = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(plane.tiltXDeg * D2R, 0, plane.tiltZDeg * D2R, "XYZ"));
  const P0 = new THREE.Vector3(...plane.point);
  const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, P0);
  const X = new THREE.Vector3(1, 0, 0).projectOnPlane(n).normalize();
  const Z = new THREE.Vector3().crossVectors(X, n).normalize();
  const N = 240;
  const M = Array.from({ length: 5 }, () => new Array(6).fill(0) as number[]);
  const ray = new THREE.Ray();
  const hit = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const [px, py] = seamPoint(seam, (i / N) * Math.PI * 2);
    const w = new THREE.Vector3((px / W) * 2 - 1, 1 - (py / H) * 2, 0.5).unproject(cam);
    ray.set(cam.position, w.sub(cam.position).normalize());
    if (!ray.intersectPlane(pl, hit)) continue;
    const d = hit.clone().sub(P0);
    const u = d.dot(X);
    const v = d.dot(Z);
    const row = [u * u, u * v, v * v, u, v];
    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) M[a][b] += row[a] * row[b];
      M[a][5] += row[a];
    }
  }
  // élimination de Gauss-Jordan (pivot partiel)
  for (let c = 0; c < 5; c++) {
    let p = c;
    for (let r = c + 1; r < 5; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 5; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 6; k++) M[r][k] -= f * M[c][k];
    }
  }
  const [A, B, C, Dd, E] = M.map((row, i) => row[5] / row[i]);
  const det = 4 * A * C - B * B;
  const u0 = (B * E - 2 * C * Dd) / det;
  const v0 = (B * Dd - 2 * A * E) / det;
  const Fc = A * u0 * u0 + B * u0 * v0 + C * v0 * v0 + Dd * u0 + E * v0 - 1;
  const tr = A + C;
  const dif = Math.sqrt((A - C) ** 2 + B * B);
  const l1 = (tr + dif) / 2;
  const l2 = (tr - dif) / 2;
  const psi = 0.5 * Math.atan2(B, A - C);
  // demi-axe a1 le long de la direction psi (valeur propre l1), a2 perpendiculaire
  const a1 = Math.sqrt(-Fc / l1);
  const a2 = Math.sqrt(-Fc / l2);
  const E1 = X.clone().multiplyScalar(Math.cos(psi)).addScaledVector(Z, Math.sin(psi));
  const E2 = new THREE.Vector3().crossVectors(E1, n).normalize();
  const center = P0.clone().addScaledVector(X, u0).addScaledVector(Z, v0);
  const m = new THREE.Matrix4().makeBasis(E1, n, E2);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return { center: [center.x, center.y, center.z], quat: [q.x, q.y, q.z, q.w], a1, a2 };
};
