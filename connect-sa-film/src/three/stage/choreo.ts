/**
 * Chorégraphie du studio 3D (S4 orbite, S5 héros, S6 collection) et de la collection de fin (S8).
 * Fonction pure de l'image absolue et du format : aucune horloge, aucun aléa.
 */
import { DeviceKind } from "../devices";
import { EASE, RING } from "../../theme";
import { TL, prog } from "../../time";
import {
  CamRig,
  D2R,
  RingPose,
  V3,
  flatPose,
  lerp,
  lerp3,
  lerpPose,
  rigPosition,
  rigSpline,
  ringPoint,
  solveSeamRing,
  makeCamera,
  projectPx,
} from "./math";
import { showDims } from "./showcase";

const ev = TL.events;

/* ------------------------------------------------------------------ */
/* Temps clés (images absolues)                                        */
/* ------------------------------------------------------------------ */

export const T = {
  seam: 342,
  fadeIn: ev.stageFadeIn as [number, number],
  flyIn: ev.devicesFlyIn as [number, number],
  titleIn: ev.orbitTitleIn,
  titleOut: ev.orbitTitleOut as [number, number],
  toLight: ev.toLight as [number, number],
  collectionTitleIn: ev.collectionTitleIn,
  heroes: TL.heroes as Record<"laptop" | "printer" | "copier", [number, number]>,
  /** transition orbite -> formation collective */
  gather: [806, 858] as [number, number],
  still: 935,
  endcardIn: ev.endcardIn as [number, number],
  endStable: ev.endStableFrom,
};

/** Fenêtres des textes héros : [entrée, sortie début, sortie fin]. */
export const HERO_TEXT: Record<"laptop" | "printer" | "copier", { in: number; out: [number, number] }> = {
  laptop: { in: 594, out: [646, 655] },
  printer: { in: 674, out: [724, 733] },
  copier: { in: 752, out: [802, 811] },
};

/** Mouvements des héros : [montée début, montée fin, descente début, descente fin]. */
const HERO_MOVE: Record<"laptop" | "printer" | "copier", [number, number, number, number]> = {
  laptop: [572, 596, 642, 666],
  printer: [652, 676, 720, 744],
  copier: [730, 754, 9998, 9999],
};

/* ------------------------------------------------------------------ */
/* Formats                                                             */
/* ------------------------------------------------------------------ */

type FmtSpec = {
  W: number;
  H: number;
  seamRig: CamRig;
  plane: { point: V3; tiltXDeg: number; tiltZDeg: number };
  /** rétrécissement de l'anneau après le raccord (vertical : garder les appareils dans le cadre) */
  ringShrink: number;
};

const SPEC: Record<"H" | "V", FmtSpec> = {
  H: {
    W: 1920,
    H: 1080,
    seamRig: { target: [0, 0.6, -1.0], dist: 6.1, el: 6.5, az: 0, fov: 28, shift: [0, 220] },
    plane: { point: [0, 0.6, -1.0], tiltXDeg: 7.4, tiltZDeg: 3 },
    ringShrink: 1,
  },
  V: {
    W: 1080,
    H: 1920,
    seamRig: { target: [0, 0.6, -1.0], dist: 7.3, el: 9, az: 0, fov: 55, shift: [0, 220] },
    plane: { point: [0, 0.6, -1.0], tiltXDeg: 7.4, tiltZDeg: 3 },
    ringShrink: 0.8,
  },
};

export type FmtData = {
  key: "H" | "V";
  spec: FmtSpec;
  seamPose: RingPose;
  /** centre de l'anneau au raccord */
  C: V3;
  /** point du sol sous le centre */
  G: V3;
  /** rayon du tube (unités scène) donnant ~5 px au raccord */
  coreR: number;
  /** distance caméra -> centre au raccord (référence de la compensation d'épaisseur) */
  dRef: number;
  seamCam: V3;
  camKeys: { f: number; rig: CamRig }[];
  heroSpot: V3;
  arrangement: Record<DeviceKind, { x: number; z: number; yaw: number }>;
  floorRing: { r1: number; r2: number };
};

const cache: Partial<Record<"H" | "V", FmtData>> = {};

/** Formation collective (S6 et carte de fin), relative au point G du sol. */
const ARR_H: Record<DeviceKind, { x: number; z: number; yaw: number }> = {
  printer: { x: -1.3, z: -0.5, yaw: 22 },
  copier: { x: 0.02, z: -0.72, yaw: -6 },
  desktop: { x: 1.32, z: -0.42, yaw: -24 },
  laptop: { x: -0.72, z: 0.62, yaw: 26 },
  accessories: { x: 0.1, z: 0.82, yaw: -4 },
  toner: { x: 0.95, z: 0.6, yaw: -30 },
};

const ARR_V: Record<DeviceKind, { x: number; z: number; yaw: number }> = {
  printer: { x: -0.86, z: -0.32, yaw: 24 },
  copier: { x: 0.12, z: -0.95, yaw: -8 },
  desktop: { x: 0.95, z: -0.22, yaw: -26 },
  laptop: { x: -0.6, z: 0.72, yaw: 24 },
  accessories: { x: 0.18, z: 1.12, yaw: -6 },
  toner: { x: 0.82, z: 0.72, yaw: -28 },
};

export const ENDCARD_ARR = ARR_H;

export const getFmt = (isV: boolean): FmtData => {
  const key = isV ? "V" : "H";
  const hit = cache[key];
  if (hit) return hit;
  const spec = SPEC[key];
  const TS = TL.seams.ringAt342[isV ? "vertical" : "horizontal"];
  const seamPose = solveSeamRing(TS, spec.seamRig, spec.W, spec.H, spec.plane);
  const C = seamPose.center;
  const G: V3 = [C[0], 0, C[2]];
  const seamCam = rigPosition(spec.seamRig);
  const dRef = Math.hypot(seamCam[0] - C[0], seamCam[1] - C[1], seamCam[2] - C[2]);
  const f = spec.H / 2 / Math.tan((spec.seamRig.fov * D2R) / 2);
  const coreR = (RING.coreWidthPx / 2) * (dRef / f);

  const shrunk = { ...seamPose, a1: seamPose.a1 * spec.ringShrink, a2: seamPose.a2 * spec.ringShrink };
  const front = ringPoint(shrunk, 0);
  const heroSpot: V3 = [front[0], front[1] + 0.04, front[2] + (isV ? 0.35 : 0.42)];
  const tC = (dx: number, dy: number, dz: number): V3 => [C[0] + dx, C[1] + dy, C[2] + dz];
  const tG = (dx: number, dy: number, dz: number): V3 => [G[0] + dx, G[1] + dy, G[2] + dz];
  const tHs = (dy: number): V3 => [heroSpot[0], heroSpot[1] + dy, heroSpot[2]];

  const camKeys: { f: number; rig: CamRig }[] = isV
    ? [
        { f: 342, rig: spec.seamRig },
        { f: 430, rig: { target: tC(0, 0.32, 0), dist: 7.0, el: 12.5, az: -3, fov: 55, shift: [0, 150] } },
        { f: 572, rig: { target: tC(0, 0.42, 0), dist: 6.5, el: 14, az: -9, fov: 55, shift: [0, 120] } },
        { f: 600, rig: { target: tHs(0.32), dist: 4.3, el: 9, az: -7, fov: 55, shift: [0, -170] } },
        { f: 646, rig: { target: tHs(0.32), dist: 4.1, el: 10, az: -3, fov: 55, shift: [0, -170] } },
        { f: 680, rig: { target: tHs(0.3), dist: 4.2, el: 16, az: 6, fov: 55, shift: [0, -170] } },
        { f: 724, rig: { target: tHs(0.3), dist: 4.0, el: 16, az: 2, fov: 55, shift: [0, -170] } },
        { f: 758, rig: { target: tHs(0.72), dist: 5.0, el: 9, az: -6, fov: 55, shift: [0, -170] } },
        { f: 806, rig: { target: tHs(0.72), dist: 4.8, el: 9, az: -2, fov: 55, shift: [0, -170] } },
        { f: 860, rig: { target: tG(0, 0.62, 0.05), dist: 7.1, el: 19, az: -4, fov: 55, shift: [0, -110] } },
        { f: 940, rig: { target: tG(0, 0.62, 0.05), dist: 6.9, el: 19, az: 0, fov: 55, shift: [0, -110] } },
      ]
    : [
        { f: 342, rig: spec.seamRig },
        { f: 430, rig: { target: tC(0, 0.25, 0), dist: 7.3, el: 9, az: -3, fov: 28, shift: [0, 150] } },
        { f: 572, rig: { target: tC(0, 0.32, 0), dist: 6.8, el: 10.5, az: -9, fov: 28, shift: [0, 130] } },
        { f: 600, rig: { target: tHs(0.32), dist: 4.2, el: 9, az: -10, fov: 28, shift: [-330, 40] } },
        { f: 646, rig: { target: tHs(0.32), dist: 4.0, el: 10, az: -6, fov: 28, shift: [-330, 40] } },
        { f: 680, rig: { target: tHs(0.28), dist: 4.1, el: 15, az: -4, fov: 28, shift: [-330, 50] } },
        { f: 724, rig: { target: tHs(0.28), dist: 3.95, el: 15, az: -1, fov: 28, shift: [-330, 50] } },
        { f: 758, rig: { target: tHs(0.72), dist: 5.0, el: 8, az: -9, fov: 28, shift: [-330, 30] } },
        { f: 806, rig: { target: tHs(0.72), dist: 4.85, el: 8, az: -5, fov: 28, shift: [-330, 30] } },
        { f: 860, rig: { target: tG(0, 0.55, 0.05), dist: 7.4, el: 15, az: -4, fov: 28, shift: [-210, 60] } },
        { f: 940, rig: { target: tG(0, 0.55, 0.05), dist: 7.2, el: 15, az: 0, fov: 28, shift: [-210, 60] } },
      ];

  const data: FmtData = {
    key,
    spec,
    seamPose,
    C,
    G,
    coreR,
    dRef,
    seamCam,
    camKeys,
    heroSpot,
    arrangement: isV ? ARR_V : ARR_H,
    floorRing: isV ? { r1: 1.75, r2: 1.75 } : { r1: 2.25, r2: 1.6 },
  };
  cache[key] = data;
  return data;
};

/* ------------------------------------------------------------------ */
/* État de scène                                                       */
/* ------------------------------------------------------------------ */

export type DeviceState = {
  kind: DeviceKind;
  pos: V3;
  /** lacet (degrés) ; 0 = face avant vers +Z */
  yaw: number;
  /** roulis léger pendant l'arrivée (degrés) */
  roll: number;
  /** échelle vitrine × variation */
  scale: number;
  visible: boolean;
  screenOn: number;
  /** 0..1 : appareil mis en avant (héros) */
  focus: number;
};

export type RingState = {
  pose: RingPose;
  radius: number;
  glowRadius: number;
  glow: number;
  opacity: number;
  /** 1 = épaisseur compensée en profondeur (raccord 2D), 0 = tube 3D naturel */
  flat: number;
  floorGlow: number;
  floorSigma: number;
};

export type StageState = {
  rig: CamRig;
  camPos: V3;
  ring: RingState;
  devices: DeviceState[];
  /** 0 = studio graphite, 1 = studio clair */
  light: number;
  /** 0..1 : intensité de la mise en avant d'un héros */
  focus: number;
  heroPos: V3;
  fog: { near: number; far: number };
  /** centre du sol (ombres) */
  floorCenter: V3;
};

/** Ordre sur l'anneau : les héros se suivent (72° d'écart), puis poste et toner. */
const SLOT: Record<Exclude<DeviceKind, "accessories">, number> = {
  laptop: 0,
  printer: 1,
  copier: 2,
  desktop: 3,
  toner: 4,
};
/** Ordre d'arrivée (le plus grand d'abord) */
const LAND_ORDER: Exclude<DeviceKind, "accessories">[] = ["copier", "desktop", "printer", "laptop", "toner"];

const wrap180 = (a: number) => {
  let x = (a + 180) % 360;
  if (x < 0) x += 360;
  return x - 180;
};

const faceYaw = (p: V3, cam: V3) => Math.atan2(cam[0] - p[0], cam[2] - p[2]) / D2R;

/** Angle de carrousel Φ (degrés). Appareil k : φ = Φ − 72·slot. */
const carouselPhi = (f: number) => {
  const s4 = spline1(
    [
      [342, 192],
      [384, 212],
      [470, 276],
      [550, 344],
      [590, 360],
    ],
    f,
  );
  const drift = 0.05 * Math.max(0, Math.min(f, 806) - 590);
  const step1 = 72 * prog(f, 644, 676, EASE.inOut);
  const step2 = 72 * prog(f, 722, 754, EASE.inOut);
  return s4 + drift + step1 + step2;
};

const spline1 = (pts: [number, number][], f: number) => {
  // Hermite monotone simple (tangentes Catmull-Rom, nulles aux extrémités)
  if (f <= pts[0][0]) return pts[0][1];
  const n = pts.length;
  if (f >= pts[n - 1][0]) return pts[n - 1][1];
  let i = 0;
  while (i < n - 2 && f > pts[i + 1][0]) i++;
  const [f0, v0] = pts[i];
  const [f1, v1] = pts[i + 1];
  const tan = (j: number) => (j <= 0 || j >= n - 1 ? 0 : (pts[j + 1][1] - pts[j - 1][1]) / (pts[j + 1][0] - pts[j - 1][0]));
  const dt = f1 - f0;
  const t = (f - f0) / dt;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;
  return h00 * v0 + h10 * tan(i) * dt + h01 * v1 + h11 * tan(i + 1) * dt;
};

/** 0..1 : progression d'un héros (montée puis descente). */
const heroAmt = (k: "laptop" | "printer" | "copier", f: number) => {
  const m = HERO_MOVE[k];
  return prog(f, m[0], m[1], EASE.inOut) - prog(f, m[2], m[3], EASE.inOut);
};

/** Intensité de mise en avant (assombrit les autres). */
const focusAmt = (f: number) =>
  Math.max(heroAmt("laptop", f), heroAmt("printer", f), heroAmt("copier", f) * (1 - prog(f, 804, 836, EASE.inOut)));

const HERO_POSE: Record<"laptop" | "printer" | "copier", { scale: number; yaw: [number, number]; lift: number }> = {
  laptop: { scale: 1.55, yaw: [34, 8], lift: 0.06 },
  printer: { scale: 1.42, yaw: [-30, -4], lift: 0.04 },
  copier: { scale: 1.1, yaw: [30, 6], lift: 0.02 },
};

const ringPoseAt = (F: FmtData, f: number): RingPose => {
  const sp = F.seamPose;
  const shrink = lerp(1, F.spec.ringShrink, prog(f, 344, 420, EASE.inOut));
  const orbit: RingPose = { ...sp, a1: sp.a1 * shrink, a2: sp.a2 * shrink };
  const g = prog(f, T.gather[0], T.gather[1] - 4, EASE.inOut);
  if (g <= 0) return orbit;
  const floor = flatPose([F.G[0], 0.012, F.G[2] + 0.05], F.floorRing.r1, F.floorRing.r2);
  return lerpPose(orbit, floor, g);
};

const rotY = (x: number, z: number, deg: number): [number, number] => {
  const a = deg * D2R;
  return [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
};

/** Position/lacet d'un appareil dans la formation collective (rotation de plateau incluse). */
export const arrangementPose = (F: FmtData, k: DeviceKind, groupYaw: number) => {
  const a = F.arrangement[k];
  const [x, z] = rotY(a.x, a.z, groupYaw);
  return { pos: [F.G[0] + x, 0, F.G[2] + z] as V3, yaw: a.yaw + groupYaw };
};

export const computeStage = (f: number, isV: boolean): StageState => {
  const F = getFmt(isV);
  const rig = rigSpline(F.camKeys, f);
  const camPos = rigPosition(rig);
  const pose = ringPoseAt(F, f);
  const phi = carouselPhi(f);
  const focus = focusAmt(f);
  const light = prog(f, T.toLight[0], T.toLight[1], EASE.inOut);
  const groupYaw = 7 * (1 - prog(f, 850, T.still, EASE.out));

  const devices: DeviceState[] = [];

  (Object.keys(SLOT) as Exclude<DeviceKind, "accessories">[]).forEach((kind) => {
    const slot = SLOT[kind];
    const dims = showDims(kind);
    const phiK = phi - 72 * slot;
    const seed = slot * 1.7 + 0.4;
    // --- position sur l'orbite
    const onRing = ringPoint(pose, phiK);
    const bob = 0.022 * Math.sin((f / 30) * 2 * Math.PI * 0.32 + seed * 2.1);
    let pos: V3 = [onRing[0], onRing[1] + 0.035 + bob, onRing[2]];
    const sinPhi = Math.sin(wrap180(phiK) * D2R);
    let yaw = faceYaw(pos, camPos) + 34 * sinPhi + 6 * Math.sin((f / 30) * 0.9 + seed);
    let scale = dims.s * (1 + 0.025 * Math.sin((f / 30) * 1.1 + seed * 1.3));
    let roll = 0;
    let visible = true;
    // --- arrivée (devicesFlyIn)
    const li = LAND_ORDER.indexOf(kind);
    const s0 = T.flyIn[0] + li * 4;
    const s1 = s0 + 24;
    if (f < s0) visible = false;
    const pf = prog(f, s0, s1, EASE.out);
    const pv = prog(f, s0, s1, (t) => 1 - (1 - t) ** 3);
    if (pf < 1) {
      const from: V3 = [pos[0] * 1.15, pos[1] + 3.6, pos[2] - 0.4];
      pos = [lerp(from[0], pos[0], pf), lerp(from[1], pos[1], pv), lerp(from[2], pos[2], pf)];
      yaw += (1 - pf) * -150;
      roll = (1 - pf) * 14 * (slot % 2 === 0 ? 1 : -1);
      scale *= lerp(0.82, 1, pf);
    }
    // --- héros (S5)
    let myFocus = 0;
    if (kind === "laptop" || kind === "printer" || kind === "copier") {
      const h = heroAmt(kind, f);
      const hp = HERO_POSE[kind];
      const win = T.heroes[kind];
      const yr = prog(f, win[0] - 8, win[1] + 6, (t) => t);
      const heroP: V3 = [F.heroSpot[0], F.heroSpot[1] + hp.lift + 0.015 * Math.sin((f / 30) * 1.6), F.heroSpot[2]];
      const heroYaw = faceYaw(heroP, camPos) + lerp(hp.yaw[0], hp.yaw[1], EASE.inOut(yr));
      const hh = kind === "copier" ? Math.max(h, f >= HERO_MOVE.copier[1] ? 1 : 0) : h;
      if (hh > 0) {
        pos = lerp3(pos, heroP, hh);
        yaw = lerp(yaw, yaw + wrap180(heroYaw - yaw), hh);
        scale = lerp(scale, dims.s * hp.scale, hh);
      }
      myFocus = h;
    }
    // les autres reculent légèrement pendant la mise en avant
    const recede = focus * (1 - myFocus);
    if (recede > 0) {
      const away = [pos[0] - camPos[0], 0, pos[2] - camPos[2]];
      const L = Math.hypot(away[0], away[2]) || 1;
      pos = [pos[0] + (away[0] / L) * 1.25 * recede, pos[1], pos[2] + (away[2] / L) * 1.25 * recede];
      scale *= 1 - 0.12 * recede;
    }
    // --- rassemblement en formation (S6), interpolation polaire autour de G (aucun croisement)
    const st = { copier: 0, printer: 2, laptop: 4, desktop: 5, toner: 7 }[kind];
    const c = prog(f, T.gather[0] + st, T.gather[1] - 8 + st, EASE.inOut);
    if (c > 0) {
      const A = arrangementPose(F, kind, groupYaw);
      const a0 = Math.atan2(pos[0] - F.G[0], pos[2] - F.G[2]) / D2R;
      const r0 = Math.hypot(pos[0] - F.G[0], pos[2] - F.G[2]);
      const a1raw = Math.atan2(A.pos[0] - F.G[0], A.pos[2] - F.G[2]) / D2R;
      const r1 = Math.hypot(A.pos[0] - F.G[0], A.pos[2] - F.G[2]);
      const REF = 178;
      const da = wrap180(a1raw - a0 - REF) + REF;
      const a = (a0 + da * c) * D2R;
      const r = lerp(r0, r1, c);
      // arc vertical : l'appareil se pose au sol
      pos = [F.G[0] + r * Math.sin(a), lerp(pos[1], 0, c) + Math.sin(Math.PI * c) * 0.08, F.G[2] + r * Math.cos(a)];
      yaw = yaw + (wrap180(A.yaw - yaw) + 0) * c;
      // échelle vitrine identique pour la collection
      scale = lerp(scale, dims.s, c);
      roll = lerp(roll, 0, c);
    }
    const screenOn = kind === "laptop" || kind === "desktop" ? prog(f, s1 - 6, s1 + 12) : 0;
    devices.push({ kind, pos, yaw, roll, scale, visible, screenOn, focus: myFocus });
  });

  // --- accessoires : arrivent pendant le rassemblement
  {
    const A = arrangementPose(F, "accessories", groupYaw);
    const s0 = 824;
    const s1 = 852;
    const pf = prog(f, s0, s1, EASE.out);
    const pv = prog(f, s0, s1, (t) => 1 - (1 - t) ** 3);
    const dims = showDims("accessories");
    devices.push({
      kind: "accessories",
      pos: [A.pos[0], lerp(3.4, 0, pv), lerp(A.pos[2] - 0.3, A.pos[2], pf)],
      yaw: A.yaw + (1 - pf) * 120,
      roll: (1 - pf) * -10,
      scale: dims.s * lerp(0.85, 1, pf),
      visible: f >= s0,
      screenOn: 0,
      focus: 0,
    });
  }

  // --- anneau
  const gather = prog(f, T.gather[0], T.gather[1], EASE.inOut);
  const ring: RingState = {
    pose,
    radius: F.coreR * lerp(1, 0.72, gather),
    glowRadius: F.coreR * lerp(6.5, 4.5, gather),
    glow: lerp(1, 0.78, focus) * lerp(1, 0.42, light),
    opacity: prog(f, 337, 343, (t) => t),
    flat: 1 - prog(f, 343, 390, EASE.inOut),
    floorGlow: prog(f, 338, 380, EASE.out) * lerp(1, 0.7, focus) * lerp(1, 0.45, light),
    floorSigma: lerp(0.55, 0.22, gather),
  };

  // --- brouillard (assombrit ce qui recule)
  const distC = Math.hypot(camPos[0] - F.C[0], camPos[1] - F.C[1], camPos[2] - F.C[2]);
  const heroDist = Math.hypot(camPos[0] - F.heroSpot[0], camPos[1] - F.heroSpot[1], camPos[2] - F.heroSpot[2]);
  const fogNear = lerp(lerp(distC + 1.2, heroDist + 0.6, focus), 60, light);
  const fogFar = lerp(lerp(distC + 13, heroDist + 6.5, focus), 120, light);

  return {
    rig,
    camPos,
    ring,
    devices,
    light,
    focus,
    heroPos: F.heroSpot,
    fog: { near: fogNear, far: fogFar },
    floorCenter: F.G,
  };
};

/* ------------------------------------------------------------------ */
/* Carte de fin (S8)                                                   */
/* ------------------------------------------------------------------ */

export type EndcardState = { rig: CamRig; devices: DeviceState[]; appear: number };

const ENDCARD_ORDER: DeviceKind[] = ["copier", "printer", "desktop", "laptop", "toner", "accessories"];

export const computeEndcard = (f: number, isV: boolean): EndcardState => {
  const region = TL.seams.endcardProductsRegion[isV ? "vertical" : "horizontal"];
  const W = isV ? 1080 : 1920;
  const H = isV ? 1920 : 1080;
  // même focale en px dans les deux formats -> même cadrage dans la région 960×640
  const fH = 1080 / 2 / Math.tan((28 * D2R) / 2);
  const fov = (2 * Math.atan(H / 2 / fH)) / D2R;
  const cx = region.x + region.w / 2;
  const cy = region.y + region.h / 2;
  const settle = prog(f, T.endcardIn[0], T.endStable, EASE.out);
  const rig: CamRig = {
    target: [0, 0.5, -0.02],
    dist: lerp(7.75, 7.55, settle),
    el: 14,
    az: -2,
    fov,
    shift: [cx - W / 2, cy - H / 2 + 26],
  };
  const devices: DeviceState[] = ENDCARD_ORDER.map((kind, i) => {
    const a = ENDCARD_ARR[kind];
    const s0 = T.endcardIn[0] + i * 2;
    const p = prog(f, s0, T.endStable, EASE.out);
    const dims = showDims(kind);
    return {
      kind,
      pos: [a.x, lerp(-0.22, 0, p), a.z],
      yaw: a.yaw + lerp(-10, 0, p),
      roll: 0,
      scale: dims.s * lerp(0.94, 1, p),
      visible: true,
      screenOn: kind === "laptop" || kind === "desktop" ? 1 : 0,
      focus: 0,
    };
  });
  return { rig, devices, appear: prog(f, T.endcardIn[0], T.endcardIn[0] + 12, (t) => t) };
};

/* ------------------------------------------------------------------ */
/* Vérification du raccord (utilisé par la prévisualisation)          */
/* ------------------------------------------------------------------ */

export const seamCheck = (isV: boolean) => {
  const F = getFmt(isV);
  const cam = makeCamera(F.spec.seamRig, F.spec.W, F.spec.H);
  const pts: [number, number][] = [];
  for (let i = 0; i < 72; i++) pts.push(projectPx(cam, ringPoint(F.seamPose, i * 5), F.spec.W, F.spec.H).slice(0, 2) as [number, number]);
  return { pts, pose: F.seamPose };
};
